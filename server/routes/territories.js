import express from 'express';
import pool from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const US_SHALE_PLAYS = [
  { name: 'Permian Basin',          slug: 'permian',      states: 'TX, NM',           center_lat: 31.8000, center_lon: -102.5000, zoom_level: 7, color: '#8b5cf6', sort_order: 1 },
  { name: 'Eagle Ford',             slug: 'eagle-ford',   states: 'TX',               center_lat: 28.5000, center_lon:  -98.5000, zoom_level: 7, color: '#0ea5e9', sort_order: 2 },
  { name: 'Haynesville',           slug: 'haynesville',  states: 'LA, TX',            center_lat: 32.0000, center_lon:  -93.5000, zoom_level: 7, color: '#f97316', sort_order: 3 },
  { name: 'Barnett',                slug: 'barnett',      states: 'TX',               center_lat: 32.5000, center_lon:  -97.5000, zoom_level: 8, color: '#84cc16', sort_order: 4 },
  { name: 'SCOOP-STACK / Anadarko', slug: 'scoop-stack',  states: 'OK',               center_lat: 35.5000, center_lon:  -98.0000, zoom_level: 7, color: '#eab308', sort_order: 5 },
  { name: 'Woodford',               slug: 'woodford',     states: 'OK',               center_lat: 34.5000, center_lon:  -96.5000, zoom_level: 8, color: '#a855f7', sort_order: 6 },
  { name: 'Arkoma Basin',           slug: 'arkoma',       states: 'OK, AR',           center_lat: 35.0000, center_lon:  -94.5000, zoom_level: 8, color: '#6366f1', sort_order: 7 },
  { name: 'Fayetteville',           slug: 'fayetteville', states: 'AR',               center_lat: 35.5000, center_lon:  -92.0000, zoom_level: 8, color: '#64748b', sort_order: 8 },
  { name: 'Bakken / Williston',     slug: 'bakken',       states: 'ND, MT, SD',       center_lat: 47.9000, center_lon: -103.0000, zoom_level: 6, color: '#f59e0b', sort_order: 9 },
  { name: 'Powder River Basin',     slug: 'powder-river', states: 'WY',               center_lat: 43.5000, center_lon: -106.0000, zoom_level: 7, color: '#ef4444', sort_order: 10 },
  { name: 'DJ Basin / Niobrara',    slug: 'dj-basin',     states: 'CO, WY, NE, KS',  center_lat: 40.5000, center_lon: -104.5000, zoom_level: 7, color: '#ec4899', sort_order: 11 },
  { name: 'Piceance Basin',         slug: 'piceance',     states: 'CO',               center_lat: 39.5000, center_lon: -108.0000, zoom_level: 8, color: '#14b8a6', sort_order: 12 },
  { name: 'San Juan Basin',         slug: 'san-juan',     states: 'NM, CO',           center_lat: 36.8000, center_lon: -107.8000, zoom_level: 8, color: '#0891b2', sort_order: 13 },
  { name: 'Marcellus',              slug: 'marcellus',    states: 'PA, WV, OH, NY',   center_lat: 41.0000, center_lon:  -78.0000, zoom_level: 6, color: '#10b981', sort_order: 14 },
  { name: 'Utica',                  slug: 'utica',        states: 'OH, PA, WV',       center_lat: 40.5000, center_lon:  -81.0000, zoom_level: 7, color: '#06b6d4', sort_order: 15 },
  { name: 'Appalachian',            slug: 'appalachian',  states: 'PA, WV, OH, VA',   center_lat: 39.5000, center_lon:  -80.5000, zoom_level: 6, color: '#22c55e', sort_order: 16 },
];

router.get('/', async (req, res) => {
  try {
    const { company_id, role, id: userId } = req.user;
    let query, params;
    if (role === 'admin') {
      query = `SELECT t.*, COUNT(o.id)::int AS operator_count FROM territories t
               LEFT JOIN operators o ON o.territory_id = t.id
               WHERE t.company_id = $1
               GROUP BY t.id ORDER BY t.sort_order, t.name`;
      params = [company_id];
    } else {
      query = `SELECT t.*, COUNT(o.id)::int AS operator_count FROM territories t
               JOIN user_territories ut ON ut.territory_id = t.id AND ut.user_id = $1
               LEFT JOIN operators o ON o.territory_id = t.id
               WHERE t.company_id = $2
               GROUP BY t.id ORDER BY t.sort_order, t.name`;
      params = [userId, company_id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch territories' });
  }
});

router.get('/all', async (req, res) => {
  try {
    const { company_id } = req.user;
    const result = await pool.query(
      `SELECT t.*, COUNT(o.id)::int AS operator_count FROM territories t
       LEFT JOIN operators o ON o.territory_id = t.id
       WHERE t.company_id = $1 GROUP BY t.id ORDER BY t.sort_order, t.name`,
      [company_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all territories' });
  }
});

router.post('/seed-defaults', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { company_id } = req.user;
    for (const t of US_SHALE_PLAYS) {
      await pool.query(
        `INSERT INTO territories (company_id, name, slug, states, center_lat, center_lon, zoom_level, color, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (company_id, slug) DO NOTHING`,
        [company_id, t.name, t.slug, t.states, t.center_lat, t.center_lon, t.zoom_level, t.color, t.sort_order]
      );
    }
    const result = await pool.query('SELECT * FROM territories WHERE company_id=$1 ORDER BY sort_order,name', [company_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to seed territories' });
  }
});

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { company_id } = req.user;
    const { name, states, center_lat, center_lon, zoom_level, color, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
    const result = await pool.query(
      `INSERT INTO territories (company_id, name, slug, states, center_lat, center_lon, zoom_level, color, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [company_id, name, slug, states||'', center_lat||null, center_lon||null, zoom_level||7, color||'#1e3a5f', sort_order||99]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create territory' });
  }
});

router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { company_id } = req.user;
    const { name, states, center_lat, center_lon, zoom_level, color, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE territories SET name=$1, states=$2, center_lat=$3, center_lon=$4, zoom_level=$5, color=$6, sort_order=$7
       WHERE id=$8 AND company_id=$9 RETURNING *`,
      [name, states||'', center_lat||null, center_lon||null, zoom_level||7, color||'#1e3a5f', sort_order||99, req.params.id, company_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update territory' });
  }
});

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { company_id } = req.user;
    await pool.query(`UPDATE operators SET territory_id=NULL WHERE territory_id=$1`, [req.params.id]);
    await pool.query(`UPDATE rigs SET territory_id=NULL WHERE territory_id=$1`, [req.params.id]);
    await pool.query(`DELETE FROM territories WHERE id=$1 AND company_id=$2`, [req.params.id, company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete territory' });
  }
});

router.get('/:id/users', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { company_id } = req.user;
    const assigned = await pool.query(
      `SELECT u.id, u.name, u.email, u.role FROM users u
       JOIN user_territories ut ON ut.user_id = u.id
       WHERE ut.territory_id = $1 AND u.company_id = $2`,
      [req.params.id, company_id]
    );
    const all = await pool.query(
      `SELECT id, name, email, role FROM users WHERE company_id=$1 AND active=true ORDER BY name`,
      [company_id]
    );
    res.json({ assigned: assigned.rows, all: all.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch territory users' });
  }
});

router.post('/:id/users', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { user_id } = req.body;
    await pool.query(
      `INSERT INTO user_territories (user_id, territory_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

router.delete('/:id/users/:userId', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await pool.query(
      `DELETE FROM user_territories WHERE territory_id=$1 AND user_id=$2`,
      [req.params.id, req.params.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

export default router;
