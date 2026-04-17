import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const params = companyId ? [companyId] : [];
    const where = companyId ? 'WHERE rp.company_id = $1' : '';
    const result = await pool.query(`
      SELECT rp.*, o.name as operator_name
      FROM revenue_packages rp
      LEFT JOIN operators o ON rp.operator_id = o.id
      ${where}
      ORDER BY rp.updated_at DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

router.post('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, package_name, notes, days_per_month, items } = req.body;
    const result = await pool.query(
      `INSERT INTO revenue_packages (company_id, operator_id, package_name, notes, days_per_month, items)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [companyId, operator_id || null, package_name, notes, days_per_month || 30, JSON.stringify(items || [])]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { operator_id, package_name, notes, days_per_month, items } = req.body;
    const result = await pool.query(
      `UPDATE revenue_packages SET operator_id=$1, package_name=$2, notes=$3, days_per_month=$4, items=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [operator_id || null, package_name, notes, days_per_month || 30, JSON.stringify(items || []), req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM revenue_packages WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

export default router;
