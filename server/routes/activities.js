import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, contact_id, type, completed, overdue, due_today } = req.query;
    let query = `
      SELECT a.*, 
        o.name as operator_name,
        c.name as contact_name, c.title as contact_title,
        u.name as user_name
      FROM activities a
      LEFT JOIN operators o ON a.operator_id = o.id
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND a.company_id = $${params.length}`; }
    if (operator_id) { params.push(operator_id); query += ` AND a.operator_id = $${params.length}`; }
    if (contact_id) { params.push(contact_id); query += ` AND a.contact_id = $${params.length}`; }
    if (type) { params.push(type); query += ` AND a.activity_type = $${params.length}`; }
    if (completed === 'true') query += ` AND a.is_completed = true`;
    if (completed === 'false') query += ` AND a.is_completed = false`;
    if (overdue === 'true') query += ` AND a.follow_up_date < CURRENT_DATE AND a.is_completed = false`;
    if (due_today === 'true') query += ` AND a.follow_up_date = CURRENT_DATE AND a.is_completed = false`;
    query += ' ORDER BY a.activity_date DESC, a.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const params = [];
    const cond = companyId ? (params.push(companyId), `AND company_id = $${params.length}`) : '';
    const [total, dueToday, overdue, thisWeek, completed] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM activities WHERE 1=1 ${cond}`, params),
      pool.query(`SELECT COUNT(*) FROM activities WHERE follow_up_date = CURRENT_DATE AND is_completed = false ${cond}`, params),
      pool.query(`SELECT COUNT(*) FROM activities WHERE follow_up_date < CURRENT_DATE AND is_completed = false ${cond}`, params),
      pool.query(`SELECT COUNT(*) FROM activities WHERE activity_date >= NOW() - INTERVAL '7 days' ${cond}`, params),
      pool.query(`SELECT COUNT(*) FROM activities WHERE is_completed = true ${cond}`, params),
    ]);
    res.json({
      total: parseInt(total.rows[0].count || 0),
      due_today: parseInt(dueToday.rows[0].count || 0),
      overdue: parseInt(overdue.rows[0].count || 0),
      this_week: parseInt(thisWeek.rows[0].count || 0),
      completed: parseInt(completed.rows[0].count || 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { operator_id, contact_id, activity_type, subject, notes, activity_date, follow_up_date, follow_up_notes } = req.body;
    const company_id = req.user.company_id;
    const user_id = req.user.id;
    const result = await pool.query(
      `INSERT INTO activities (company_id, user_id, operator_id, contact_id, activity_type, subject, notes, activity_date, follow_up_date, follow_up_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [company_id, user_id, operator_id || null, contact_id || null, activity_type || 'Call', subject, notes, activity_date || new Date(), follow_up_date || null, follow_up_notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { operator_id, contact_id, activity_type, subject, notes, activity_date, follow_up_date, follow_up_notes, is_completed } = req.body;
    const companyId = tenantFilter(req);
    let query = `UPDATE activities SET operator_id=$1, contact_id=$2, activity_type=$3, subject=$4, notes=$5,
      activity_date=$6, follow_up_date=$7, follow_up_notes=$8, is_completed=$9, updated_at=NOW() WHERE id=$10`;
    const params = [operator_id || null, contact_id || null, activity_type, subject, notes, activity_date, follow_up_date || null, follow_up_notes, is_completed ?? false, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

router.patch('/:id/complete', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { is_completed } = req.body;
    let query = `UPDATE activities SET is_completed=$1, updated_at=NOW() WHERE id=$2`;
    const params = [is_completed ?? true, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'DELETE FROM activities WHERE id=$1';
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

export default router;
