import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { search, basin, state, territory_id } = req.query;
    const { id: userId, role } = req.user;

    let query = `
      SELECT o.*, 
        (SELECT COUNT(*) FROM rigs r WHERE r.operator_id = o.id AND r.status = 'active' AND r.company_id = o.company_id) as active_rig_count,
        (SELECT COUNT(*) FROM contacts c WHERE c.operator_id = o.id) as contact_count,
        ms.status as msa_status,
        (o.revenue_per_rig * (SELECT COUNT(*) FROM rigs r WHERE r.operator_id = o.id AND r.status = 'active' AND r.company_id = o.company_id)) as total_revenue_potential,
        t.name as territory_name, t.color as territory_color
      FROM operators o
      LEFT JOIN msa_status ms ON ms.operator_id = o.id AND ms.company_id = o.company_id
      LEFT JOIN territories t ON t.id = o.territory_id
      WHERE 1=1
    `;
    const params = [];

    if (companyId) {
      params.push(companyId);
      query += ` AND o.company_id = $${params.length}`;
    }
    if (territory_id) {
      params.push(territory_id);
      query += ` AND o.territory_id = $${params.length}`;
    } else if (role !== 'admin') {
      params.push(userId);
      query += ` AND (o.territory_id IS NULL OR o.territory_id IN (SELECT territory_id FROM user_territories WHERE user_id = $${params.length}))`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND o.name ILIKE $${params.length}`;
    }
    if (basin) {
      params.push(basin);
      query += ` AND o.basin = $${params.length}`;
    }
    if (state) {
      params.push(state);
      query += ` AND o.state = $${params.length}`;
    }

    query += ' ORDER BY o.name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch operators' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT o.*, 
        (SELECT COUNT(*) FROM rigs r WHERE r.operator_id = o.id AND r.status = 'active' AND r.company_id = o.company_id) as active_rig_count,
        ms.status as msa_status, ms.signed_date, ms.expiry_date
      FROM operators o
      LEFT JOIN msa_status ms ON ms.operator_id = o.id AND ms.company_id = o.company_id
      WHERE o.id = $1
    `;
    const params = [req.params.id];
    if (companyId) {
      params.push(companyId);
      query += ` AND o.company_id = $${params.length}`;
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Operator not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch operator' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, basin, state, relationship_score, next_action, next_action_date, revenue_per_rig, notes, last_contact_date, territory_id, operator_type, parent_company, hq_city, hq_state } = req.body;
    const company_id = req.user.role === 'admin' ? (req.body.company_id || req.user.company_id) : req.user.company_id;

    const result = await pool.query(
      `INSERT INTO operators (company_id, name, basin, state, relationship_score, next_action, next_action_date, revenue_per_rig, notes, last_contact_date, territory_id, operator_type, parent_company, hq_city, hq_state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [company_id, name, basin, state, relationship_score || 5, next_action, next_action_date, revenue_per_rig || 0, notes, last_contact_date, territory_id || null, operator_type || 'public', parent_company || null, hq_city || null, hq_state || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create operator' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, basin, state, relationship_score, next_action, next_action_date, revenue_per_rig, notes, last_contact_date, territory_id, operator_type, parent_company, hq_city, hq_state } = req.body;
    const companyId = tenantFilter(req);

    let query = `UPDATE operators SET name=$1, basin=$2, state=$3, relationship_score=$4,
      next_action=$5, next_action_date=$6, revenue_per_rig=$7, notes=$8, last_contact_date=$9,
      territory_id=$10, operator_type=$11, parent_company=$12, hq_city=$13, hq_state=$14, updated_at=NOW()
      WHERE id=$15`;
    const params = [name, basin, state, relationship_score, next_action, next_action_date, revenue_per_rig, notes, last_contact_date, territory_id || null, operator_type || 'public', parent_company || null, hq_city || null, hq_state || null, req.params.id];

    if (companyId) {
      params.push(companyId);
      query += ` AND company_id = $${params.length}`;
    }
    query += ' RETURNING *';

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Operator not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update operator' });
  }
});

// Upload price sheet (stored as base64 in DB)
router.post('/:id/price-sheet', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    if (!req.files || !req.files.file) return res.status(400).json({ error: 'No file uploaded' });
    const file = req.files.file;
    const base64 = file.data.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    let query = `UPDATE operators SET price_sheet_name=$1, price_sheet_data=$2 WHERE id=$3`;
    const params = [file.name, dataUrl, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING id, name, price_sheet_name';
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Operator not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload price sheet' });
  }
});

router.delete('/:id/price-sheet', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `UPDATE operators SET price_sheet_name=NULL, price_sheet_data=NULL WHERE id=$1`;
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove price sheet' });
  }
});

/* ─── COMPETITORS ──────────────────────────────── */

router.get('/:id/competitors', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'SELECT * FROM operator_competitors WHERE operator_id = $1';
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' ORDER BY category, created_at';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

router.post('/:id/competitors', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { category, competitor_name, notes } = req.body;
    if (!category || !competitor_name) return res.status(400).json({ error: 'category and competitor_name required' });
    const result = await pool.query(
      `INSERT INTO operator_competitors (company_id, operator_id, category, competitor_name, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [companyId, req.params.id, category, competitor_name, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add competitor' });
  }
});

router.delete('/:opId/competitors/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'DELETE FROM operator_competitors WHERE id=$1 AND operator_id=$2';
    const params = [req.params.id, req.params.opId];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete competitor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'DELETE FROM operators WHERE id=$1';
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete operator' });
  }
});

export default router;
