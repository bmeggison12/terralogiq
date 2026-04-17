import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';
import { parse } from 'csv-parse/sync';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, status, search } = req.query;
    let query = `
      SELECT fs.*, o.name as operator_name
      FROM frac_sites fs
      LEFT JOIN operators o ON fs.operator_id = o.id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND fs.company_id = $${params.length}`; }
    if (operator_id) { params.push(operator_id); query += ` AND fs.operator_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND fs.status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (fs.site_name ILIKE $${params.length} OR fs.county ILIKE $${params.length} OR o.name ILIKE $${params.length})`; }
    query += ' ORDER BY fs.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch frac sites' });
  }
});

router.post('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, site_name, county, state, latitude, longitude, status, total_wells, active_wells, notes, is_peak_site, frac_date } = req.body;
    const result = await pool.query(
      `INSERT INTO frac_sites (company_id, operator_id, site_name, county, state, latitude, longitude, status, total_wells, active_wells, notes, is_peak_site, frac_date, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Manual') RETURNING *`,
      [companyId, operator_id || null, site_name, county, state, latitude || null, longitude || null,
       status || 'Active', total_wells || 0, active_wells || 0, notes, is_peak_site || false, frac_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create frac site' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id, site_name, county, state, latitude, longitude, status, total_wells, active_wells, notes, is_peak_site, frac_date } = req.body;
    let query = `
      UPDATE frac_sites SET operator_id=$1, site_name=$2, county=$3, state=$4, latitude=$5, longitude=$6,
        status=$7, total_wells=$8, active_wells=$9, notes=$10, is_peak_site=$11, frac_date=$12, updated_at=NOW()
      WHERE id=$13
    `;
    const params = [operator_id || null, site_name, county, state, latitude || null, longitude || null,
      status || 'Active', total_wells || 0, active_wells || 0, notes, is_peak_site || false, frac_date || null, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update frac site' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'DELETE FROM frac_sites WHERE id=$1';
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete frac site' });
  }
});

router.post('/upload-csv', async (req, res) => {
  try {
    if (!req.files || !req.files.csv) return res.status(400).json({ error: 'No CSV file uploaded' });
    const companyId = tenantFilter(req);
    const csvData = req.files.csv.data.toString();

    const records = parse(csvData, { columns: true, skip_empty_lines: true, trim: true });

    // Load operators for matching
    const { rows: operators } = await pool.query(
      'SELECT id, name FROM operators WHERE company_id = $1', [companyId]
    );

    function findOperator(name) {
      if (!name) return null;
      const norm = n => (n || '').toUpperCase().replace(/[,.\-_]/g, ' ').replace(/\s+/g, ' ').trim();
      const na = norm(name);
      for (const op of operators) {
        const nb = norm(op.name);
        if (na === nb || na.includes(nb) || nb.includes(na)) return op.id;
      }
      return null;
    }

    let imported = 0;
    for (const row of records) {
      const siteName = row['Well Name'] || row['Site Name'] || row['site_name'] || row['WellName'] || row['Lease Name'] || 'Unknown Site';
      const opName = row['Operator'] || row['Operator Company Name'] || row['operator'] || '';
      const operatorId = findOperator(opName);
      const county = (row['County'] || row['County/Parish'] || '').replace(/\s*\(.*\)/, '').trim();
      const state = (row['State'] || row['State/Province'] || '').replace(/\s*\(.*\)/, '').trim();
      const lat = parseFloat(row['Latitude'] || row['Rig Latitude (WGS84)'] || row['Surface Latitude'] || '') || null;
      const lon = parseFloat(row['Longitude'] || row['Rig Longitude (WGS84)'] || row['Surface Longitude'] || '') || null;
      const fracDate = row['Spud Date'] || row['Frac Date'] || row['Date'] || null;

      await pool.query(
        `INSERT INTO frac_sites (company_id, operator_id, site_name, county, state, latitude, longitude, status, notes, frac_date, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'Active',$8,$9,'Enverus')`,
        [companyId, operatorId, siteName, county, state, lat, lon, opName ? `Operator: ${opName}` : null, fracDate || null]
      );
      imported++;
    }

    res.json({ success: true, imported, message: `Imported ${imported} frac sites from CSV` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CSV upload failed: ' + err.message });
  }
});

export default router;
