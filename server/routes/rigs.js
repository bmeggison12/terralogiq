import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';
import { parse } from 'csv-parse/sync';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, status, basin, territory_id } = req.query;
    const { id: userId, role } = req.user;
    let query = `
      SELECT r.*, COALESCE(o.name, r.operator_name_display, 'Unknown') as operator_name,
             t.name as territory_name, t.color as territory_color
      FROM rigs r 
      LEFT JOIN operators o ON r.operator_id = o.id 
      LEFT JOIN territories t ON t.id = r.territory_id
      WHERE 1=1
    `;
    const params = [];

    if (companyId) { params.push(companyId); query += ` AND r.company_id = $${params.length}`; }
    if (territory_id) {
      params.push(territory_id);
      query += ` AND r.territory_id = $${params.length}`;
    } else if (role !== 'admin') {
      params.push(userId);
      query += ` AND (r.territory_id IS NULL OR r.territory_id IN (SELECT territory_id FROM user_territories WHERE user_id = $${params.length}))`;
    }
    if (operator_id) { params.push(operator_id); query += ` AND r.operator_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND r.status = $${params.length}`; }
    if (basin) { params.push(basin); query += ` AND r.basin = $${params.length}`; }

    query += ' ORDER BY r.operator_id, r.rig_name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rigs' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT 
        o.id as operator_id,
        o.name as operator_name,
        o.basin,
        COUNT(r.id) FILTER (WHERE r.status = 'active') as active_rigs,
        COUNT(r.id) as total_rigs,
        o.revenue_per_rig,
        o.revenue_per_rig * COUNT(r.id) FILTER (WHERE r.status = 'active') as revenue_potential
      FROM operators o
      LEFT JOIN rigs r ON r.operator_id = o.id AND r.company_id = o.company_id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND o.company_id = $${params.length}`; }
    query += ' GROUP BY o.id, o.name, o.basin, o.revenue_per_rig ORDER BY active_rigs DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rig summary' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, weeks = 12 } = req.query;
    let query = `
      SELECT rh.*, o.name as operator_name 
      FROM rig_history rh
      JOIN operators o ON rh.operator_id = o.id
      WHERE rh.week_date >= CURRENT_DATE - ($1 * 7)
    `;
    const params = [weeks];

    if (companyId) { params.push(companyId); query += ` AND rh.company_id = $${params.length}`; }
    if (operator_id) { params.push(operator_id); query += ` AND rh.operator_id = $${params.length}`; }

    query += ' ORDER BY rh.week_date DESC, o.name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rig history' });
  }
});

router.post('/upload-csv', async (req, res) => {
  try {
    if (!req.files || !req.files.csv) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const company_id = req.user.company_id;
    const csvData = req.files.csv.data.toString();

    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let imported = 0;
    const weekDate = new Date().toISOString().split('T')[0];

    for (const row of records) {
      const operatorName = row['Operator'] || row['operator'] || row['OPERATOR'];
      if (!operatorName) continue;

      let operatorResult = await pool.query(
        'SELECT id FROM operators WHERE LOWER(name) = LOWER($1) AND company_id = $2',
        [operatorName, company_id]
      );

      let operatorId;
      if (operatorResult.rows.length === 0) {
        const newOp = await pool.query(
          'INSERT INTO operators (company_id, name, basin, state) VALUES ($1,$2,$3,$4) RETURNING id',
          [company_id, operatorName, row['Basin'] || row['basin'] || null, row['State'] || row['state'] || null]
        );
        operatorId = newOp.rows[0].id;
      } else {
        operatorId = operatorResult.rows[0].id;
      }

      await pool.query(
        `INSERT INTO rigs (company_id, operator_id, rig_name, rig_number, contractor, basin, county, state, spud_date, status, week_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)`,
        [
          company_id, operatorId,
          row['Rig Name'] || row['rig_name'] || row['RigName'] || null,
          row['Rig Number'] || row['rig_number'] || row['RigNumber'] || null,
          row['Contractor'] || row['contractor'] || null,
          row['Basin'] || row['basin'] || null,
          row['County'] || row['county'] || null,
          row['State'] || row['state'] || null,
          row['Spud Date'] || row['spud_date'] || null,
          weekDate
        ]
      );
      imported++;
    }

    const operatorCounts = await pool.query(
      `SELECT operator_id, COUNT(*) as rig_count FROM rigs WHERE company_id = $1 AND status = 'active' GROUP BY operator_id`,
      [company_id]
    );

    for (const row of operatorCounts.rows) {
      await pool.query(
        `INSERT INTO rig_history (company_id, operator_id, week_date, rig_count)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (company_id, operator_id, week_date) DO UPDATE SET rig_count = $4`,
        [company_id, row.operator_id, weekDate, row.rig_count]
      );
    }

    res.json({ success: true, imported, message: `Successfully imported ${imported} rigs` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CSV upload failed: ' + err.message });
  }
});

// Update Company Man
router.put('/:id/company-man', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { company_man_day, company_man_night } = req.body;
    let query = `UPDATE rigs SET company_man_day=$1, company_man_night=$2 WHERE id=$3`;
    const params = [company_man_day || null, company_man_night || null, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rig not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update company man' });
  }
});

// Update Win Probability
router.put('/:id/probability', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { win_probability } = req.body;
    const val = win_probability === null || win_probability === '' ? null : Math.min(100, Math.max(0, parseInt(win_probability, 10)));
    let query = `UPDATE rigs SET win_probability=$1 WHERE id=$2`;
    const params = [val, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rig not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update probability' });
  }
});

// Toggle Peak Rig
router.put('/:id/peak', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { is_peak_rig, peak_notes } = req.body;
    let query = `UPDATE rigs SET is_peak_rig=$1, peak_notes=$2 WHERE id=$3`;
    const params = [is_peak_rig, peak_notes || null, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rig not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update rig' });
  }
});

// Get equipment for a rig
router.get('/:id/equipment', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rig_equipment WHERE rig_id = $1 ORDER BY item_name',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// Add equipment item to rig
router.post('/:id/equipment', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { item_name, quantity, unit, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO rig_equipment (company_id, rig_id, item_name, quantity, unit, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [companyId, req.params.id, item_name, quantity || 1, unit || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add equipment' });
  }
});

// Update equipment item
router.put('/equipment/:id', async (req, res) => {
  try {
    const { item_name, quantity, unit, notes } = req.body;
    const result = await pool.query(
      `UPDATE rig_equipment SET item_name=$1, quantity=$2, unit=$3, notes=$4 WHERE id=$5 RETURNING *`,
      [item_name, quantity || 1, unit || null, notes || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

// Delete equipment item
router.delete('/equipment/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM rig_equipment WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

// Market share stats
router.get('/market-share', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const params = [];
    let where = 'WHERE 1=1';
    if (companyId) { params.push(companyId); where += ` AND r.company_id = $${params.length}`; }

    const result = await pool.query(`
      SELECT
        o.name as operator_name,
        COUNT(r.id) as total_rigs,
        COUNT(r.id) FILTER (WHERE r.is_peak_rig = true) as peak_rigs,
        ROUND(
          100.0 * COUNT(r.id) FILTER (WHERE r.is_peak_rig = true) / NULLIF(COUNT(r.id), 0),
          1
        ) as peak_share_pct
      FROM rigs r
      JOIN operators o ON r.operator_id = o.id
      ${where}
      GROUP BY o.id, o.name
      ORDER BY total_rigs DESC, o.name
    `, params);

    const totals = await pool.query(`
      SELECT
        COUNT(*) as total_rigs,
        COUNT(*) FILTER (WHERE is_peak_rig = true) as peak_rigs
      FROM rigs r
      ${where}
    `, params);

    res.json({ byOperator: result.rows, totals: totals.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch market share' });
  }
});

router.get('/market-share/overview', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const params = [];
    let cWhere = 'WHERE 1=1';
    if (companyId) { params.push(companyId); cWhere += ` AND r.company_id = $${params.length}`; }

    const [rigTotals, byOperator, byCounty, byBasin, fracTotals, jobTotals, byMsa] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as total_rigs, COUNT(*) FILTER (WHERE is_peak_rig = true) as peak_rigs
        FROM rigs r ${cWhere}
      `, params),

      pool.query(`
        SELECT o.name as operator_name,
          COUNT(r.id) as total_rigs,
          COUNT(r.id) FILTER (WHERE r.is_peak_rig = true) as peak_rigs,
          ROUND(100.0 * COUNT(r.id) FILTER (WHERE r.is_peak_rig = true) / NULLIF(COUNT(r.id),0), 1) as peak_pct
        FROM rigs r JOIN operators o ON r.operator_id = o.id
        ${cWhere}
        GROUP BY o.id, o.name ORDER BY total_rigs DESC, o.name LIMIT 25
      `, params),

      pool.query(`
        SELECT INITCAP(LOWER(r.county)) as county,
          COUNT(r.id) as total_rigs,
          COUNT(r.id) FILTER (WHERE r.is_peak_rig = true) as peak_rigs
        FROM rigs r ${cWhere} AND r.county IS NOT NULL
        GROUP BY r.county ORDER BY total_rigs DESC LIMIT 15
      `, params),

      pool.query(`
        SELECT r.basin,
          COUNT(r.id) as total_rigs,
          COUNT(r.id) FILTER (WHERE r.is_peak_rig = true) as peak_rigs
        FROM rigs r ${cWhere} AND r.basin IS NOT NULL
        GROUP BY r.basin ORDER BY total_rigs DESC
      `, params),

      pool.query(`
        SELECT COUNT(*) as total_frac, COUNT(*) FILTER (WHERE is_peak_site = true) as peak_frac
        FROM frac_sites ${companyId ? 'WHERE company_id = $1' : ''}
      `, companyId ? [companyId] : []),

      pool.query(`
        SELECT COUNT(*) as total_jobs, COUNT(*) FILTER (WHERE is_peak_site = true) as peak_jobs
        FROM job_sites ${companyId ? 'WHERE company_id = $1' : ''}
      `, companyId ? [companyId] : []),

      pool.query(`
        SELECT o.name as operator_name, ms.status as msa_status, ms.signed_date,
          COUNT(r.id) as total_rigs,
          COUNT(r.id) FILTER (WHERE r.is_peak_rig = true) as peak_rigs,
          ROUND(100.0 * COUNT(r.id) FILTER (WHERE r.is_peak_rig = true) / NULLIF(COUNT(r.id),0), 1) as peak_pct
        FROM msa_status ms
        JOIN operators o ON ms.operator_id = o.id
        LEFT JOIN rigs r ON r.operator_id = o.id ${companyId ? 'AND r.company_id = $1' : ''}
        ${companyId ? 'WHERE ms.company_id = $1' : ''}
        GROUP BY o.id, o.name, ms.status, ms.signed_date
        ORDER BY ms.status, total_rigs DESC
      `, companyId ? [companyId] : []),
    ]);

    res.json({
      totals: rigTotals.rows[0],
      byOperator: byOperator.rows,
      byCounty: byCounty.rows,
      byBasin: byBasin.rows,
      fracTotals: fracTotals.rows[0],
      jobTotals: jobTotals.rows[0],
      byMsa: byMsa.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch market share overview' });
  }
});

export default router;
