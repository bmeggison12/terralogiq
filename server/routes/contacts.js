import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const { operator_id } = req.query;
    let query = `SELECT c.*, o.name as operator_name FROM contacts c JOIN operators o ON c.operator_id = o.id WHERE 1=1`;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND c.company_id = $${params.length}`; }
    if (operator_id) { params.push(operator_id); query += ` AND c.operator_id = $${params.length}`; }
    query += ' ORDER BY c.is_primary DESC, c.department NULLS LAST, c.name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { operator_id, name, title, department, role_type, influence_level, email, phone, mobile_phone, office_location, is_primary, notes } = req.body;
    const company_id = req.user.company_id;
    const result = await pool.query(
      `INSERT INTO contacts (operator_id, company_id, name, title, department, role_type, influence_level, email, phone, mobile_phone, office_location, is_primary, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [operator_id, company_id, name, title || null, department || null, role_type || null, influence_level || null, email || null, phone || null, mobile_phone || null, office_location || null, is_primary || false, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) return res.status(400).json({ error: 'No contacts provided' });
    const company_id = req.user.company_id;
    let imported = 0, skipped = 0, errors = [];

    for (const c of contacts) {
      if (!c.name || !String(c.name).trim()) { skipped++; continue; }

      let operator_id = c.operator_id || null;
      if (!operator_id && c.operator_name) {
        const opResult = await pool.query(
          `SELECT id FROM operators WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND company_id = $2`,
          [c.operator_name, company_id]
        );
        if (opResult.rows.length > 0) {
          operator_id = opResult.rows[0].id;
        } else {
          errors.push(`Operator not found: "${c.operator_name}" (contact: ${c.name})`);
          skipped++;
          continue;
        }
      }

      if (!operator_id) { errors.push(`No operator for contact: ${c.name}`); skipped++; continue; }

      await pool.query(
        `INSERT INTO contacts (company_id, operator_id, name, title, department, email, phone, mobile_phone, office_location, is_primary, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [company_id, operator_id, String(c.name).trim(), c.title || null, c.department || null, c.email || null, c.phone || null, c.mobile_phone || null, c.office_location || null, c.is_primary || false, c.notes || null]
      );
      imported++;
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bulk import failed: ' + err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, title, department, role_type, influence_level, email, phone, mobile_phone, office_location, is_primary, notes } = req.body;
    const companyId = tenantFilter(req);
    let query = `UPDATE contacts SET name=$1, title=$2, department=$3, role_type=$4, influence_level=$5, email=$6, phone=$7, mobile_phone=$8, office_location=$9, is_primary=$10, notes=$11 WHERE id=$12`;
    const params = [name, title || null, department || null, role_type || null, influence_level || null, email || null, phone || null, mobile_phone || null, office_location || null, is_primary, notes || null, req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' RETURNING *';
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = 'DELETE FROM contacts WHERE id=$1';
    const params = [req.params.id];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
