import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Seed default types if none exist for this company
async function ensureDefaultTypes(companyId) {
  const { rows } = await pool.query(
    'SELECT id FROM job_site_types WHERE company_id = $1', [companyId]
  );
  if (rows.length === 0) {
    const defaults = [
      { name: 'Flowback', color: '#0ea5e9' },
      { name: 'Production', color: '#10b981' },
      { name: 'Coil Tubing', color: '#f59e0b' },
    ];
    for (let i = 0; i < defaults.length; i++) {
      await pool.query(
        `INSERT INTO job_site_types (company_id, name, color, sort_order) VALUES ($1,$2,$3,$4)`,
        [companyId, defaults[i].name, defaults[i].color, i]
      );
    }
  }
}

/* ─── SITE TYPES ─────────────────────────────── */

router.get('/types', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    await ensureDefaultTypes(companyId);
    const result = await pool.query(
      'SELECT * FROM job_site_types WHERE company_id = $1 ORDER BY sort_order, name',
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch site types' });
  }
});

router.post('/types', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { name, color } = req.body;
    const { rows: existing } = await pool.query(
      'SELECT MAX(sort_order) as max FROM job_site_types WHERE company_id = $1', [companyId]
    );
    const nextOrder = (existing[0].max ?? -1) + 1;
    const result = await pool.query(
      `INSERT INTO job_site_types (company_id, name, color, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [companyId, name, color || '#6366f1', nextOrder]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create site type' });
  }
});

router.put('/types/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { name, color } = req.body;
    const result = await pool.query(
      `UPDATE job_site_types SET name=$1, color=$2 WHERE id=$3 AND company_id=$4 RETURNING *`,
      [name, color || '#6366f1', req.params.id, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update site type' });
  }
});

router.delete('/types/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    await pool.query(
      'DELETE FROM job_site_types WHERE id=$1 AND company_id=$2',
      [req.params.id, companyId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete site type' });
  }
});

/* ─── JOB SITES ──────────────────────────────── */

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { site_type_id, status, search } = req.query;
    let query = `
      SELECT js.*, o.name as operator_name, jt.name as site_type_name, jt.color as site_type_color
      FROM job_sites js
      LEFT JOIN operators o ON js.operator_id = o.id
      LEFT JOIN job_site_types jt ON js.site_type_id = jt.id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND js.company_id = $${params.length}`; }
    if (site_type_id) { params.push(site_type_id); query += ` AND js.site_type_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND js.status = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (js.site_name ILIKE $${params.length} OR js.county ILIKE $${params.length} OR o.name ILIKE $${params.length})`;
    }
    query += ' ORDER BY js.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job sites' });
  }
});

router.post('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, site_type_id, site_name, county, state, latitude, longitude, status, wells_count, notes, is_peak_site, job_date } = req.body;
    const result = await pool.query(
      `INSERT INTO job_sites (company_id, operator_id, site_type_id, site_name, county, state, latitude, longitude, status, wells_count, notes, is_peak_site, job_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [companyId, operator_id || null, site_type_id || null, site_name, county, state,
       latitude || null, longitude || null, status || 'Active',
       wells_count || 0, notes, is_peak_site || false, job_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create job site' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, site_type_id, site_name, county, state, latitude, longitude, status, wells_count, notes, is_peak_site, job_date } = req.body;
    let query = `
      UPDATE job_sites SET operator_id=$1, site_type_id=$2, site_name=$3, county=$4, state=$5,
        latitude=$6, longitude=$7, status=$8, wells_count=$9, notes=$10, is_peak_site=$11, job_date=$12, updated_at=NOW()
      WHERE id=$13
    `;
    const params = [operator_id || null, site_type_id || null, site_name, county, state,
      latitude || null, longitude || null, status || 'Active',
      wells_count || 0, notes, is_peak_site || false, job_date || null, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job site' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'DELETE FROM job_sites WHERE id=$1';
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job site' });
  }
});

export default router;
