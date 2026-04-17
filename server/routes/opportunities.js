import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const STAGES = ['Identified', 'Contacted', 'Visited', 'Pricing', 'MSA', 'Won', 'Lost'];

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { stage, operator_id } = req.query;
    let query = `
      SELECT opp.*, o.name as operator_name, u.name as assigned_to_name
      FROM opportunities opp
      JOIN operators o ON opp.operator_id = o.id
      LEFT JOIN users u ON opp.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND opp.company_id = $${params.length}`; }
    if (stage) { params.push(stage); query += ` AND opp.stage = $${params.length}`; }
    if (operator_id) { params.push(operator_id); query += ` AND opp.operator_id = $${params.length}`; }
    query += ' ORDER BY opp.updated_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

router.get('/pipeline', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT stage, COUNT(*) as count, SUM(value) as total_value
      FROM opportunities WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' GROUP BY stage ORDER BY array_position(ARRAY[\'Identified\',\'Contacted\',\'Visited\',\'Pricing\',\'MSA\',\'Won\',\'Lost\'], stage)';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { operator_id, title, stage, value, description, assigned_to, expected_close_date, probability, equipment_type, competitor_on_site, follow_up_date } = req.body;
    const company_id = req.user.company_id;
    const result = await pool.query(
      `INSERT INTO opportunities (company_id, operator_id, title, stage, value, description, assigned_to, expected_close_date, probability, equipment_type, competitor_on_site, follow_up_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [company_id, operator_id, title, stage || 'Identified', value || 0, description, assigned_to || null, expected_close_date || null, probability || null, equipment_type || null, competitor_on_site || null, follow_up_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { operator_id, title, stage, value, description, assigned_to, expected_close_date, probability, equipment_type, competitor_on_site, follow_up_date } = req.body;
    const companyId = tenantFilter(req);
    let query = `UPDATE opportunities SET operator_id=$1, title=$2, stage=$3, value=$4, description=$5, 
      assigned_to=$6, expected_close_date=$7, probability=$8, equipment_type=$9, competitor_on_site=$10, follow_up_date=$11, updated_at=NOW() WHERE id=$12`;
    const params = [operator_id, title, stage, value, description, assigned_to || null, expected_close_date || null, probability || null, equipment_type || null, competitor_on_site || null, follow_up_date || null, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'DELETE FROM opportunities WHERE id=$1';
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
});

export default router;
