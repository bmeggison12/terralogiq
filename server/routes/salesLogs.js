import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, user_id, from_date, to_date } = req.query;
    let query = `
      SELECT sl.*, o.name as operator_name, u.name as user_name, r.rig_name
      FROM sales_logs sl
      JOIN operators o ON sl.operator_id = o.id
      JOIN users u ON sl.user_id = u.id
      LEFT JOIN rigs r ON sl.rig_id = r.id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND sl.company_id = $${params.length}`; }
    if (operator_id) { params.push(operator_id); query += ` AND sl.operator_id = $${params.length}`; }
    if (user_id) { params.push(user_id); query += ` AND sl.user_id = $${params.length}`; }
    if (from_date) { params.push(from_date); query += ` AND sl.log_date >= $${params.length}`; }
    if (to_date) { params.push(to_date); query += ` AND sl.log_date <= $${params.length}`; }
    query += ' ORDER BY sl.log_date DESC, sl.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales logs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { operator_id, rig_id, log_date, contact_method, notes, competitor_equipment, next_steps } = req.body;
    const result = await pool.query(
      `INSERT INTO sales_logs (company_id, user_id, operator_id, rig_id, log_date, contact_method, notes, competitor_equipment, next_steps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.company_id, req.user.id, operator_id, rig_id, log_date || new Date(), contact_method, notes, competitor_equipment, next_steps]
    );

    if (log_date || true) {
      await pool.query(
        'UPDATE operators SET last_contact_date = $1 WHERE id = $2',
        [log_date || new Date().toISOString().split('T')[0], operator_id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create sales log' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { operator_id, rig_id, log_date, contact_method, notes, competitor_equipment, next_steps } = req.body;
    const companyId = tenantFilter(req);
    let query = `UPDATE sales_logs SET operator_id=$1, rig_id=$2, log_date=$3, contact_method=$4, 
      notes=$5, competitor_equipment=$6, next_steps=$7 WHERE id=$8`;
    const params = [operator_id, rig_id, log_date, contact_method, notes, competitor_equipment, next_steps, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sales log' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'DELETE FROM sales_logs WHERE id=$1';
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete sales log' });
  }
});

export default router;
