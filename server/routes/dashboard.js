import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const params = [];
    const cond = companyId ? (params.push(companyId), `AND company_id = $${params.length}`) : '';

    const [rigs, operators, opps, logs, msaActive] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) as total FROM rigs WHERE 1=1 ${cond}`, params),
      pool.query(`SELECT COUNT(*) as total FROM operators WHERE 1=1 ${cond}`, params),
      pool.query(`SELECT COUNT(*) as total, SUM(value) as total_value FROM opportunities WHERE 1=1 ${cond}`, params),
      pool.query(`SELECT COUNT(*) as total FROM sales_logs WHERE log_date >= CURRENT_DATE - 7 ${cond ? cond.replace('AND', 'AND') : ''}`, params),
      pool.query(`SELECT COUNT(*) as total FROM msa_status WHERE status = 'Active' ${cond ? cond.replace('AND', 'AND') : ''}`, params)
    ]);

    res.json({
      rigs: {
        active: parseInt(rigs.rows[0].active || 0),
        total: parseInt(rigs.rows[0].total || 0),
        inactive: parseInt(rigs.rows[0].total || 0) - parseInt(rigs.rows[0].active || 0)
      },
      operators: { total: parseInt(operators.rows[0].total || 0) },
      opportunities: {
        total: parseInt(opps.rows[0].total || 0),
        total_value: parseFloat(opps.rows[0].total_value || 0)
      },
      sales_logs_this_week: parseInt(logs.rows[0].total || 0),
      msa_active: parseInt(msaActive.rows[0].total || 0)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

router.get('/rigs-by-operator', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT o.name as operator_name, o.basin,
        COUNT(r.id) FILTER (WHERE r.status = 'active') as active_rigs,
        o.revenue_per_rig,
        o.revenue_per_rig * COUNT(r.id) FILTER (WHERE r.status = 'active') as revenue_potential
      FROM operators o
      LEFT JOIN rigs r ON r.operator_id = o.id AND r.company_id = o.company_id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND o.company_id = $${params.length}`; }
    query += ` GROUP BY o.id, o.name, o.basin, o.revenue_per_rig HAVING COUNT(r.id) > 0 ORDER BY active_rigs DESC LIMIT 10`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rigs by operator' });
  }
});

router.get('/pipeline-summary', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as total_value FROM opportunities WHERE 1=1`;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ` GROUP BY stage ORDER BY array_position(ARRAY['Identified','Contacted','Visited','Pricing','MSA','Won','Lost'], stage)`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pipeline summary' });
  }
});

router.get('/rig-trend', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT week_date, SUM(rig_count) as total_rigs
      FROM rig_history WHERE week_date >= CURRENT_DATE - 84
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' GROUP BY week_date ORDER BY week_date ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rig trend' });
  }
});

router.get('/recent-activity', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT sl.id, sl.log_date, sl.contact_method, sl.notes, sl.next_steps,
        o.name as operator_name, u.name as user_name
      FROM sales_logs sl
      JOIN operators o ON sl.operator_id = o.id
      JOIN users u ON sl.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND sl.company_id = $${params.length}`; }
    query += ' ORDER BY sl.log_date DESC, sl.created_at DESC LIMIT 8';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

router.get('/follow-ups-due', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const params = [];
    const cond = companyId ? (params.push(companyId), `AND a.company_id = $${params.length}`) : '';
    const result = await pool.query(`
      SELECT a.id, a.subject, a.activity_type, a.follow_up_date, a.follow_up_notes,
        o.name as operator_name, c.name as contact_name, u.name as user_name,
        CASE WHEN a.follow_up_date < CURRENT_DATE THEN 'overdue'
             WHEN a.follow_up_date = CURRENT_DATE THEN 'today' ELSE 'upcoming' END as urgency
      FROM activities a
      LEFT JOIN operators o ON a.operator_id = o.id
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.follow_up_date IS NOT NULL AND a.is_completed = false ${cond}
      ORDER BY a.follow_up_date ASC LIMIT 10
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

router.get('/top-opportunities', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT opp.id, opp.title, opp.stage, opp.value, opp.probability, opp.expected_close_date,
        o.name as operator_name
      FROM opportunities opp
      JOIN operators o ON opp.operator_id = o.id
      WHERE opp.stage NOT IN ('Lost','Won')
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND opp.company_id = $${params.length}`; }
    query += ' ORDER BY opp.value DESC LIMIT 5';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top opportunities' });
  }
});

router.get('/msa-summary', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `SELECT status, COUNT(*) as count FROM msa_status WHERE 1=1`;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND company_id = $${params.length}`; }
    query += ' GROUP BY status ORDER BY count DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch MSA summary' });
  }
});

router.get('/overdue-accounts', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT o.id, o.name, o.basin, o.relationship_score,
        MAX(sl.log_date) as last_contact,
        CURRENT_DATE - MAX(sl.log_date) as days_since_contact,
        COUNT(sl.id) as total_logs
      FROM operators o
      LEFT JOIN sales_logs sl ON sl.operator_id = o.id AND sl.company_id = o.company_id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND o.company_id = $${params.length}`; }
    query += `
      GROUP BY o.id, o.name, o.basin, o.relationship_score
      HAVING MAX(sl.log_date) < CURRENT_DATE - 30 OR MAX(sl.log_date) IS NULL
      ORDER BY last_contact ASC NULLS FIRST LIMIT 5
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch overdue accounts' });
  }
});

export default router;
