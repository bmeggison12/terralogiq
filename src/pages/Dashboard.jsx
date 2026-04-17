import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';

function Icon({ name }) {
  const icons = {
    rig: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    operators: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    opp: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    msa: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  };
  return icons[name] || null;
}

function formatCurrency(val) {
  if (!val) return '$0';
  const n = parseFloat(val);
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

const stageColors = {
  Identified: '#94a3b8', Contacted: '#0891b2', Visited: '#7c3aed',
  Pricing: '#ca8a04', MSA: '#ea580c', Won: '#16a34a', Lost: '#dc2626'
};

const MSA_COLORS = {
  'Active': '#16a34a', 'In Progress': '#ca8a04', 'In Review': '#ca8a04',
  'Sent for Signature': '#7c3aed', 'Expired': '#dc2626', 'Not Started': '#94a3b8', 'Terminated': '#dc2626'
};

const URGENCY = {
  overdue: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: 'Overdue' },
  today: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'Due Today' },
  upcoming: { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', label: 'Upcoming' },
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [rigsByOp, setRigsByOp] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [trend, setTrend] = useState([]);
  const [activity, setActivity] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [topOpps, setTopOpps] = useState([]);
  const [msaSummary, setMsaSummary] = useState([]);
  const [overdueAccts, setOverdueAccts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.summary(),
      api.dashboard.rigsByOperator(),
      api.dashboard.pipelineSummary(),
      api.dashboard.rigTrend(),
      api.dashboard.recentActivity(),
      api.dashboard.followUpsDue().catch(() => []),
      api.dashboard.topOpportunities().catch(() => []),
      api.dashboard.msaSummary().catch(() => []),
      api.dashboard.overdueAccounts().catch(() => []),
    ]).then(([s, r, p, t, a, fu, to, ms, oa]) => {
      setSummary(s);
      setRigsByOp(r);
      setPipeline(p);
      setTrend(t);
      setActivity(a);
      setFollowUps(fu);
      setTopOpps(to);
      setMsaSummary(ms);
      setOverdueAccts(oa);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"/>Loading dashboard...</div>;

  const totalRevPotential = rigsByOp.reduce((s, r) => s + parseFloat(r.revenue_potential || 0), 0);
  const maxTrend = Math.max(...trend.map(t => parseInt(t.total_rigs) || 0), 1);
  const STAGES = ['Identified','Contacted','Visited','Pricing','MSA','Won','Lost'];
  const pipelineMap = {};
  pipeline.forEach(p => { pipelineMap[p.stage] = p; });

  const overdueFollowUps = followUps.filter(f => f.urgency === 'overdue');
  const todayFollowUps = followUps.filter(f => f.urgency === 'today');

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time overview of your sales operations</p>
        </div>
        {(overdueFollowUps.length > 0 || overdueAccts.length > 0) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {overdueFollowUps.length > 0 && (
              <div style={{ padding: '8px 14px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
                ⚠ {overdueFollowUps.length} overdue follow-up{overdueFollowUps.length !== 1 ? 's' : ''}
              </div>
            )}
            {todayFollowUps.length > 0 && (
              <div style={{ padding: '8px 14px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fde68a', color: '#c2410c', fontSize: 12, fontWeight: 700 }}>
                🔔 {todayFollowUps.length} due today
              </div>
            )}
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Icon name="rig" /></div>
          <div className="stat-content">
            <div className="value">{summary?.rigs.active || 0}</div>
            <div className="label">Active Rigs</div>
            <div className="sub">{summary?.rigs.total || 0} total tracked</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Icon name="operators" /></div>
          <div className="stat-content">
            <div className="value">{summary?.operators.total || 0}</div>
            <div className="label">Operators</div>
            <div className="sub">{summary?.msa_active || 0} with active MSA</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Icon name="opp" /></div>
          <div className="stat-content">
            <div className="value">{summary?.opportunities.total || 0}</div>
            <div className="label">Open Opportunities</div>
            <div className="sub">{formatCurrency(summary?.opportunities.total_value)} total value</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><Icon name="msa" /></div>
          <div className="stat-content">
            <div className="value">{formatCurrency(totalRevPotential)}</div>
            <div className="label">Revenue Potential</div>
            <div className="sub">{summary?.sales_logs_this_week || 0} activities this week</div>
          </div>
        </div>
      </div>

      {followUps.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: overdueFollowUps.length > 0 ? '3px solid #dc2626' : '3px solid #f59e0b' }}>
          <div className="card-header">
            <span className="card-title">
              {overdueFollowUps.length > 0 ? '⚠ Follow-up Reminders' : '🔔 Follow-up Reminders'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{followUps.length} pending</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '10px 20px 16px' }}>
            {followUps.map(f => {
              const u = URGENCY[f.urgency] || URGENCY.upcoming;
              return (
                <div key={f.id} style={{ padding: '8px 14px', borderRadius: 8, background: u.bg, border: `1px solid ${u.border}`, minWidth: 200, maxWidth: 300 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: u.color, marginBottom: 4 }}>{u.label.toUpperCase()} — {new Date(f.follow_up_date).toLocaleDateString()}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.subject || f.activity_type}</div>
                  {f.operator_name && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>🏢 {f.operator_name}</div>}
                  {f.contact_name && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>👤 {f.contact_name}</div>}
                  {f.follow_up_notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.follow_up_notes}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Rig Count Trend (12 weeks)</span>
          </div>
          {trend.length === 0 ? (
            <div className="loading" style={{ padding: 40 }}>No trend data yet</div>
          ) : (
            <div className="trend-chart">
              {trend.slice(-12).map((t, i) => {
                const height = Math.max(4, (parseInt(t.total_rigs) / maxTrend) * 130);
                return (
                  <div key={i} className="trend-bar-wrapper" title={`${t.total_rigs} rigs — ${new Date(t.week_date).toLocaleDateString()}`}>
                    <div className="trend-bar" style={{ height }} />
                    <div className="trend-label">
                      {new Date(t.week_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Opportunity Pipeline</span>
          </div>
          <div className="card-body" style={{ padding: '12px 20px' }}>
            {STAGES.map(stage => {
              const d = pipelineMap[stage];
              const count = parseInt(d?.count || 0);
              const value = parseFloat(d?.total_value || 0);
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 80, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>{stage}</div>
                  <div style={{ flex: 1 }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: count > 0 ? `${Math.min(100, count * 20)}%` : '2%', background: stageColors[stage] }} />
                    </div>
                  </div>
                  <div style={{ width: 30, fontSize: 12, fontWeight: 600, textAlign: 'right', color: stageColors[stage] }}>{count}</div>
                  <div style={{ width: 60, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{value > 0 ? formatCurrency(value) : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Opportunities</span>
          </div>
          {topOpps.length === 0 ? (
            <div className="empty-state"><p>No open opportunities</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Title</th><th>Operator</th><th>Stage</th><th>Value</th></tr></thead>
                <tbody>
                  {topOpps.map((o, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{o.title}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{o.operator_name}</td>
                      <td>
                        <span className="badge" style={{ background: (stageColors[o.stage] || '#94a3b8') + '22', color: stageColors[o.stage] || '#94a3b8', fontSize: 10 }}>{o.stage}</span>
                      </td>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatCurrency(o.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">MSA Status Summary</span>
          </div>
          <div style={{ padding: '12px 20px' }}>
            {msaSummary.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}><p>No MSA data</p></div>
            ) : (
              msaSummary.map((m, i) => {
                const color = MSA_COLORS[m.status] || '#94a3b8';
                const pct = Math.round((parseInt(m.count) / msaSummary.reduce((s, x) => s + parseInt(x.count), 0)) * 100);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{m.status}</div>
                    <div className="progress-bar" style={{ width: 100, flexShrink: 0 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div style={{ width: 20, fontSize: 13, fontWeight: 700, color, textAlign: 'right' }}>{m.count}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Rigs by Operator</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Basin</th>
                  <th>Active Rigs</th>
                  <th>Revenue Potential</th>
                </tr>
              </thead>
              <tbody>
                {rigsByOp.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.operator_name}</td>
                    <td><span className="badge badge-blue">{r.basin || '—'}</span></td>
                    <td><span style={{ fontWeight: 700, fontSize: 15 }}>{r.active_rigs || 0}</span></td>
                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatCurrency(r.revenue_potential)}</td>
                  </tr>
                ))}
                {rigsByOp.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No data yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Overdue Accounts
              {overdueAccts.length > 0 && (
                <span style={{ padding: '2px 8px', borderRadius: 100, background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700 }}>
                  {overdueAccts.length} accounts
                </span>
              )}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No contact in 30+ days</span>
          </div>
          {overdueAccts.length === 0 ? (
            <div className="empty-state"><p>All accounts contacted recently</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Operator</th><th>Basin</th><th>Last Contact</th><th>Days</th></tr></thead>
                <tbody>
                  {overdueAccts.map((a, i) => (
                    <tr key={i} style={{ background: a.days_since_contact > 60 ? '#fff5f5' : undefined }}>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.basin || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {a.last_contact ? new Date(a.last_contact).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                          background: (a.days_since_contact > 60 || !a.last_contact) ? '#fee2e2' : '#fff7ed',
                          color: (a.days_since_contact > 60 || !a.last_contact) ? '#dc2626' : '#c2410c',
                        }}>
                          {a.last_contact ? `${a.days_since_contact}d` : 'Never'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Sales Activity</span>
        </div>
        <div style={{ padding: '8px 0' }}>
          {activity.map((a, i) => (
            <div key={i} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {a.user_name?.charAt(0) || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.operator_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {a.user_name} · {a.contact_method} · {new Date(a.log_date).toLocaleDateString()}
                </div>
                {a.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes}</div>}
              </div>
            </div>
          ))}
          {activity.length === 0 && <div className="empty-state"><p>No recent activity</p></div>}
        </div>
      </div>
    </div>
  );
}
