import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ─── Company Profile ───────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { rows } = await pool.query(
      `SELECT id, name, slug, tagline, description, primary_color, logo_data,
              hq_city, hq_state, website, phone, industry_focus, what_we_sell, created_at
       FROM companies WHERE id = $1`, [companyId]
    );
    res.json(rows[0] || {});
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.put('/profile', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { name, tagline, description, primary_color, hq_city, hq_state, website, phone, industry_focus, what_we_sell } = req.body;
    const { rows } = await pool.query(
      `UPDATE companies SET
         name = COALESCE($1, name),
         tagline = $2,
         description = $3,
         primary_color = COALESCE($4, primary_color),
         hq_city = $5, hq_state = $6, website = $7, phone = $8,
         industry_focus = COALESCE($9, industry_focus),
         what_we_sell = $10
       WHERE id = $11
       RETURNING id, name, slug, tagline, description, primary_color, logo_data,
                 hq_city, hq_state, website, phone, industry_focus, what_we_sell`,
      [name, tagline, description, primary_color, hq_city, hq_state, website, phone, industry_focus, what_we_sell, companyId]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/logo', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    if (!req.files?.logo) return res.status(400).json({ error: 'No logo file uploaded' });
    const file = req.files.logo;
    const b64 = file.data.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${b64}`;
    await pool.query(`UPDATE companies SET logo_data = $1 WHERE id = $2`, [dataUrl, companyId]);
    res.json({ logo_data: dataUrl });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.delete('/logo', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    await pool.query(`UPDATE companies SET logo_data = NULL WHERE id = $1`, [companyId]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ─── Products & Services ───────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { rows } = await pool.query(
      `SELECT * FROM company_products WHERE company_id = $1 ORDER BY sort_order, name`,
      [companyId]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/products', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { name, description, category, daily_rate, weekly_rate, monthly_rate, unit, specs } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO company_products (company_id, name, description, category, daily_rate, weekly_rate, monthly_rate, unit, specs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [companyId, name, description, category, daily_rate || null, weekly_rate || null, monthly_rate || null, unit, specs]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.put('/products/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { name, description, category, daily_rate, weekly_rate, monthly_rate, unit, specs, is_active, sort_order } = req.body;
    const { rows } = await pool.query(
      `UPDATE company_products SET name=$1, description=$2, category=$3, daily_rate=$4, weekly_rate=$5,
       monthly_rate=$6, unit=$7, specs=$8, is_active=$9, sort_order=$10
       WHERE id=$11 AND company_id=$12 RETURNING *`,
      [name, description, category, daily_rate || null, weekly_rate || null, monthly_rate || null, unit, specs, is_active ?? true, sort_order ?? 0, req.params.id, companyId]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/products/:id/image', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    if (!req.files?.image) return res.status(400).json({ error: 'No image file' });
    const file = req.files.image;
    const dataUrl = `data:${file.mimetype};base64,${file.data.toString('base64')}`;
    const { rows } = await pool.query(
      `UPDATE company_products SET image_data=$1 WHERE id=$2 AND company_id=$3 RETURNING *`,
      [dataUrl, req.params.id, companyId]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    await pool.query(`DELETE FROM company_products WHERE id=$1 AND company_id=$2`, [req.params.id, companyId]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ─── Company-level Price Sheets (Rate Cards) ───────────────────
router.get('/price-sheets', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { rows } = await pool.query(
      `SELECT id, company_id, name, file_name, file_type, notes, uploaded_by, created_at
       FROM company_price_sheets WHERE company_id=$1 ORDER BY created_at DESC`,
      [companyId]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.get('/price-sheets/:id/download', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { rows } = await pool.query(
      `SELECT * FROM company_price_sheets WHERE id=$1 AND company_id=$2`, [req.params.id, companyId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ file_data: rows[0].file_data, file_name: rows[0].file_name, file_type: rows[0].file_type });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/price-sheets', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { id: userId } = req.user;
    if (!req.files?.file) return res.status(400).json({ error: 'No file uploaded' });
    const file = req.files.file;
    const { name, notes } = req.body;
    const dataUrl = `data:${file.mimetype};base64,${file.data.toString('base64')}`;
    const { rows } = await pool.query(
      `INSERT INTO company_price_sheets (company_id, name, file_name, file_data, file_type, notes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, file_name, file_type, notes, created_at`,
      [companyId, name || file.name, file.name, dataUrl, file.mimetype, notes, userId]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.delete('/price-sheets/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    await pool.query(`DELETE FROM company_price_sheets WHERE id=$1 AND company_id=$2`, [req.params.id, companyId]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ─── Active Site Deployments ───────────────────────────────────
router.get('/active-sites', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { rows } = await pool.query(
      `SELECT s.*, o.name as operator_name, r.rig_name, r.basin
       FROM company_active_sites s
       LEFT JOIN operators o ON s.operator_id = o.id
       LEFT JOIN rigs r ON s.rig_id = r.id
       WHERE s.company_id=$1 ORDER BY s.created_at DESC`,
      [companyId]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/active-sites', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, rig_id, site_name, site_type, county, state, products_on_site, units_count, start_date, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO company_active_sites (company_id, operator_id, rig_id, site_name, site_type, county, state, products_on_site, units_count, start_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [companyId, operator_id || null, rig_id || null, site_name, site_type, county, state, products_on_site, units_count || 1, start_date || null, notes]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.put('/active-sites/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, rig_id, site_name, site_type, county, state, products_on_site, units_count, start_date, notes, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE company_active_sites SET operator_id=$1, rig_id=$2, site_name=$3, site_type=$4,
       county=$5, state=$6, products_on_site=$7, units_count=$8, start_date=$9, notes=$10, is_active=$11
       WHERE id=$12 AND company_id=$13 RETURNING *`,
      [operator_id || null, rig_id || null, site_name, site_type, county, state, products_on_site, units_count || 1, start_date || null, notes, is_active ?? true, req.params.id, companyId]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.delete('/active-sites/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    await pool.query(`DELETE FROM company_active_sites WHERE id=$1 AND company_id=$2`, [req.params.id, companyId]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

export default router;
