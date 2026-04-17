import express from 'express';
import pool from '../db/index.js';
import { authenticate, tenantFilter } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';

const router = express.Router();
router.use(authenticate);

router.get('/weekly-pdf', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    const params = [];
    const cond = companyId ? (params.push(companyId), ` AND company_id = $${params.length}`) : '';

    const [rigs, operators, opps, logs, msaData, rigsByOp] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) as total FROM rigs WHERE 1=1${cond}`, params),
      pool.query(`SELECT COUNT(*) as total FROM operators WHERE 1=1${cond}`, params),
      pool.query(`SELECT stage, COUNT(*) as count, SUM(value) as total_value FROM opportunities WHERE 1=1${cond} GROUP BY stage`, params),
      pool.query(`SELECT sl.*, o.name as operator_name, u.name as user_name FROM sales_logs sl JOIN operators o ON sl.operator_id = o.id JOIN users u ON sl.user_id = u.id WHERE sl.log_date >= CURRENT_DATE - 7${cond ? cond.replace(/company_id/, 'sl.company_id') : ''} ORDER BY sl.log_date DESC LIMIT 20`, params),
      pool.query(`SELECT ms.status, COUNT(*) as count FROM msa_status ms WHERE 1=1${cond} GROUP BY ms.status`, params),
      pool.query(`SELECT o.name as operator_name, o.revenue_per_rig, COUNT(r.id) FILTER (WHERE r.status='active') as active_rigs, o.revenue_per_rig * COUNT(r.id) FILTER (WHERE r.status='active') as revenue FROM operators o LEFT JOIN rigs r ON r.operator_id=o.id AND r.company_id=o.company_id WHERE 1=1${cond} GROUP BY o.id, o.name, o.revenue_per_rig ORDER BY active_rigs DESC LIMIT 10`, params)
    ]);

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="weekly-report-${new Date().toISOString().split('T')[0]}.pdf"`);
    doc.pipe(res);

    const PRIMARY = '#1a3a5c';
    const ACCENT = '#e8760a';
    const GRAY = '#666666';

    doc.rect(0, 0, doc.page.width, 90).fill(PRIMARY);
    doc.fillColor('white').fontSize(24).font('Helvetica-Bold')
      .text('Territory CRM', 50, 25)
      .fontSize(14).font('Helvetica')
      .text('Weekly Executive Report', 50, 55)
      .fontSize(10)
      .text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 72);

    let y = 110;

    const sectionHeader = (title) => {
      doc.fillColor(PRIMARY).fontSize(14).font('Helvetica-Bold').text(title, 50, y);
      doc.moveTo(50, y + 18).lineTo(doc.page.width - 50, y + 18).strokeColor(ACCENT).lineWidth(2).stroke();
      y += 28;
    };

    const kpiRow = (items) => {
      const w = (doc.page.width - 100) / items.length;
      items.forEach((item, i) => {
        const x = 50 + i * w;
        doc.rect(x, y, w - 10, 55).fillAndStroke('#f8f9fa', '#e0e0e0');
        doc.fillColor(ACCENT).fontSize(20).font('Helvetica-Bold').text(item.value, x + 8, y + 8, { width: w - 26, align: 'center' });
        doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(item.label, x + 8, y + 35, { width: w - 26, align: 'center' });
      });
      y += 70;
    };

    sectionHeader('Key Performance Indicators');
    const totalRev = rigsByOp.rows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0);
    kpiRow([
      { label: 'Active Rigs', value: rigs.rows[0].active || '0' },
      { label: 'Total Operators', value: operators.rows[0].total || '0' },
      { label: 'Open Opportunities', value: opps.rows.filter(r => r.stage !== 'Won' && r.stage !== 'Lost').reduce((s,r) => s + parseInt(r.count), 0).toString() },
      { label: 'Revenue Potential', value: '$' + (totalRev / 1000).toFixed(0) + 'K' }
    ]);

    sectionHeader('Rig Activity by Operator');
    const tableHeaders = ['Operator', 'Active Rigs', 'Rev/Rig', 'Total Potential'];
    const colWidths = [180, 90, 100, 120];
    let tx = 50;
    doc.rect(50, y, doc.page.width - 100, 20).fill(PRIMARY);
    tableHeaders.forEach((h, i) => {
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(h, tx + 4, y + 5, { width: colWidths[i] - 8 });
      tx += colWidths[i];
    });
    y += 20;

    rigsByOp.rows.forEach((row, idx) => {
      if (idx % 2 === 0) doc.rect(50, y, doc.page.width - 100, 18).fill('#f8f9fa');
      tx = 50;
      const cells = [
        row.operator_name,
        row.active_rigs?.toString() || '0',
        '$' + parseFloat(row.revenue_per_rig || 0).toLocaleString(),
        '$' + parseFloat(row.revenue || 0).toLocaleString()
      ];
      cells.forEach((c, i) => {
        doc.fillColor('#333333').fontSize(9).font('Helvetica').text(c, tx + 4, y + 4, { width: colWidths[i] - 8 });
        tx += colWidths[i];
      });
      y += 18;
    });
    y += 15;

    if (y > 620) { doc.addPage(); y = 50; }
    sectionHeader('Opportunity Pipeline');
    const stages = ['Identified', 'Contacted', 'Visited', 'Pricing', 'MSA', 'Won', 'Lost'];
    const oppMap = {};
    opps.rows.forEach(r => { oppMap[r.stage] = { count: r.count, value: parseFloat(r.total_value || 0) }; });
    const oppCols = [120, 70, 120, 70, 120, 50, 50];
    tx = 50;
    doc.rect(50, y, doc.page.width - 100, 20).fill(PRIMARY);
    stages.forEach((s, i) => {
      doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(s, tx + 2, y + 6, { width: oppCols[i] - 4 });
      tx += oppCols[i];
    });
    y += 20;
    doc.rect(50, y, doc.page.width - 100, 20).fill('#f8f9fa');
    tx = 50;
    stages.forEach((s, i) => {
      const d = oppMap[s];
      doc.fillColor('#333333').fontSize(9).font('Helvetica')
        .text(d ? `${d.count} | $${(d.value/1000).toFixed(0)}K` : '0', tx + 2, y + 5, { width: oppCols[i] - 4 });
      tx += oppCols[i];
    });
    y += 30;

    if (y > 580) { doc.addPage(); y = 50; }
    sectionHeader('Weekly Sales Activity');
    logs.rows.slice(0, 10).forEach(log => {
      if (y > 680) { doc.addPage(); y = 50; }
      doc.rect(50, y, doc.page.width - 100, 1).fill('#e0e0e0');
      y += 4;
      doc.fillColor(PRIMARY).fontSize(9).font('Helvetica-Bold')
        .text(`${log.operator_name} — ${log.contact_method || 'Contact'}`, 50, y)
        .fillColor(GRAY).font('Helvetica').fontSize(8)
        .text(`${log.user_name} | ${new Date(log.log_date).toLocaleDateString()}`, 350, y);
      y += 14;
      if (log.notes) {
        doc.fillColor('#333333').fontSize(8).font('Helvetica').text(log.notes.substring(0, 120), 60, y, { width: doc.page.width - 120 });
        y += 14;
      }
    });

    y += 10;
    doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(PRIMARY);
    doc.fillColor('white').fontSize(8).font('Helvetica')
      .text('CONFIDENTIAL — Territory CRM Weekly Report', 50, doc.page.height - 25, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/revenue-calculator', async (req, res) => {
  try {
    const companyId = tenantFilter(req);
    let query = `
      SELECT o.id, o.name, o.basin, o.revenue_per_rig,
        COUNT(r.id) FILTER (WHERE r.status = 'active') as active_rigs,
        o.revenue_per_rig * COUNT(r.id) FILTER (WHERE r.status = 'active') as total_revenue
      FROM operators o
      LEFT JOIN rigs r ON r.operator_id = o.id AND r.company_id = o.company_id
      WHERE 1=1
    `;
    const params = [];
    if (companyId) { params.push(companyId); query += ` AND o.company_id = $${params.length}`; }
    query += ' GROUP BY o.id, o.name, o.basin, o.revenue_per_rig ORDER BY total_revenue DESC';
    const result = await pool.query(query, params);

    const totalRevenue = result.rows.reduce((s, r) => s + parseFloat(r.total_revenue || 0), 0);
    res.json({ operators: result.rows, total_revenue: totalRevenue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate revenue' });
  }
});

export default router;
