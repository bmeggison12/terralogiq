import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT ms.*, o.name as operator_name, o.basin, o.state
      FROM msa_status ms
      JOIN operators o ON ms.operator_id = o.id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND ms.company_id = $${params.length}`; }
    query += ' ORDER BY o.name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch MSA status' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { operator_id, status, signed_date, expiry_date, notes } = req.body;
    const company_id = req.user.company_id;
    const result = await pool.query(
      `INSERT INTO msa_status (company_id, operator_id, status, signed_date, expiry_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (company_id, operator_id) DO UPDATE SET status=$3, signed_date=$4, expiry_date=$5, notes=$6, updated_at=NOW()
       RETURNING *`,
      [company_id, operator_id, status, signed_date, expiry_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save MSA status' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, signed_date, expiry_date, notes } = req.body;
    const companyId = tenantFilter(req);
    let query = 'UPDATE msa_status SET status=$1, signed_date=$2, expiry_date=$3, notes=$4, updated_at=NOW() WHERE id=$5';
    const params = [status, signed_date, expiry_date, notes, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update MSA status' });
  }
});

export default router;
