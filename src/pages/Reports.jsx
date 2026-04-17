import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

function formatCurrency(val) {
  if (!val) return '$0';
  const n = parseFloat(val);
  if (n >= 1000000) return '$' + (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n/1000).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

export default function Reports() {
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('revenue');

  useEffect(() => {
    api.reports.revenueCalculator().then(setRevenue).finally(() => setLoading(false));
  }, []);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await api.reports.downloadPDF();
    } catch (err) {
      alert('Failed to generate report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const totalRevenue = revenue?.total_revenue || 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1>Reports</h1><p>Revenue calculator and weekly executive reports</p></div>
        <button className="btn btn-accent" onClick={handleDownloadPDF} disabled={downloading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {downloading ? 'Generating PDF...' : 'Download Weekly PDF'}
        </button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>Revenue Calculator</button>
        <button className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>Weekly Report Preview</button>
      </div>

      {activeTab === 'revenue' && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-icon orange">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="stat-content">
                <div className="value">{formatCurrency(totalRevenue)}</div>
                <div className="label">Total Revenue Potential</div>
                <div className="sub">Based on current active rigs</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div className="stat-content">
                <div className="value">{revenue?.operators?.reduce((s,o) => s + parseInt(o.active_rigs || 0), 0) || 0}</div>
                <div className="label">Total Active Rigs</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              </div>
              <div className="stat-content">
                <div className="value">{revenue?.operators?.filter(o => parseFloat(o.total_revenue) > 0).length || 0}</div>
                <div className="label">Revenue-Generating Operators</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Revenue Breakdown by Operator</span></div>
            <div className="table-wrapper">
              {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
                <table>
                  <thead>
                    <tr><th>Operator</th><th>Basin</th><th>Active Rigs</th><th>Revenue / Rig</th><th>Monthly Potential</th><th>Share of Total</th></tr>
                  </thead>
                  <tbody>
                    {(revenue?.operators || []).map((op, i) => {
                      const pct = totalRevenue > 0 ? (parseFloat(op.total_revenue || 0) / totalRevenue) * 100 : 0;
                      return (
                        <tr key={op.id}>
                          <td style={{ fontWeight: 600 }}>{op.name}</td>
                          <td><span className="badge badge-blue">{op.basin || '—'}</span></td>
                          <td style={{ fontWeight: 700, fontSize: 16 }}>{op.active_rigs || 0}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatCurrency(op.revenue_per_rig)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>{formatCurrency(op.total_revenue)}</td>
                          <td style={{ width: 160 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="progress-bar" style={{ flex: 1 }}>
                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 36 }}>{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(!revenue?.operators || revenue.operators.length === 0) && (
                      <tr><td colSpan={6}><div className="empty-state"><p>No revenue data yet</p></div></td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    {revenue?.operators?.length > 0 && (
                      <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                        <td>Total</td>
                        <td></td>
                        <td>{revenue?.operators?.reduce((s,o) => s + parseInt(o.active_rigs || 0), 0)}</td>
                        <td></td>
                        <td style={{ color: 'var(--accent)' }}>{formatCurrency(totalRevenue)}</td>
                        <td>100%</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'report' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Weekly Executive Report</span>
            <button className="btn btn-accent" onClick={handleDownloadPDF} disabled={downloading}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {downloading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
          <div className="card-body">
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 28, maxWidth: 600 }}>
              <div style={{ background: 'var(--primary)', color: 'white', padding: '20px 24px', borderRadius: 8, marginBottom: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>Territory CRM</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Weekly Executive Report</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', borderBottom: '2px solid var(--accent)', paddingBottom: 6, marginBottom: 12 }}>Key Performance Indicators</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Active Rigs', value: revenue?.operators?.reduce((s,o) => s + parseInt(o.active_rigs || 0), 0) || 0 },
                    { label: 'Revenue Potential', value: formatCurrency(totalRevenue) },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{item.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                <p>Full report includes rig activity, pipeline details,</p>
                <p>sales logs, and MSA status summary.</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleDownloadPDF} disabled={downloading}>
                  {downloading ? 'Generating PDF...' : 'Download Full PDF Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
