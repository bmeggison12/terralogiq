import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const PEAK_COLOR = '#ea580c';
const MARKET_COLOR = '#cbd5e1';
const PEAK_LIGHT = '#fff7ed';

const MSA_COLORS = {
  'Active':      { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  'In Review':   { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  'Expired':     { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  'Not Started': { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
};

function pct(peak, total) {
  if (!total || total === '0') return 0;
  return ((+peak / +total) * 100).toFixed(1);
}

function DonutCard({ title, peakCount, totalCount, peakLabel, otherLabel, color }) {
  const p = +peakCount || 0;
  const t = +totalCount || 0;
  const other = t - p;
  const share = t > 0 ? ((p / t) * 100).toFixed(1) : '0.0';
  const data = t > 0 ? [
    { name: peakLabel || 'Peak', value: p },
    { name: otherLabel || 'Market (non-Peak)', value: Math.max(other, 0) },
  ] : [{ name: 'No data', value: 1 }];
  const colors = t > 0 ? [color || PEAK_COLOR, MARKET_COLOR] : ['#e2e8f0'];

  return (
    <div className="card" style={{ flex: 1, minWidth: 220, padding: '20px 20px 12px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ position: 'relative', height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: color || PEAK_COLOR, lineHeight: 1 }}>{share}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Peak share</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: color || PEAK_COLOR }}>{p}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Peak</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-secondary)' }}>{t}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-secondary)' }}>{Math.max(other, 0)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Not Peak</div>
        </div>
      </div>
    </div>
  );
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const peak = payload.find(p => p.dataKey === 'peak_rigs');
  const nonPeak = payload.find(p => p.dataKey === 'non_peak');
  const total = (peak?.value || 0) + (nonPeak?.value || 0);
  const sharePct = total > 0 ? ((peak?.value / total) * 100).toFixed(1) : '0.0';
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 180 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
        <span style={{ color: PEAK_COLOR, fontWeight: 600 }}>Peak</span>
        <span style={{ fontWeight: 700 }}>{peak?.value || 0}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
        <span style={{ color: '#94a3b8' }}>Non-Peak</span>
        <span>{nonPeak?.value || 0}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--border-light)', paddingTop: 4, marginTop: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>Peak Share</span>
        <span style={{ fontWeight: 700, color: PEAK_COLOR }}>{sharePct}%</span>
      </div>
    </div>
  );
};

function ShareBar({ peak, total, color }) {
  const pctVal = total > 0 ? Math.round((peak / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ width: `${pctVal}%`, height: '100%', background: color || PEAK_COLOR, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: color || PEAK_COLOR, minWidth: 38, textAlign: 'right' }}>{pctVal}%</span>
    </div>
  );
}

export default function MarketShare() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [opLimit, setOpLimit] = useState(15);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const d = await api.rigs.marketShareOverview();
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading" style={{ padding: 40 }}><div className="spinner" />Loading market share data…</div>;
  if (error) return <div className="empty-state"><p>Error: {error}</p></div>;
  if (!data) return null;

  const { totals, byOperator, byCounty, byBasin, fracTotals, jobTotals, byMsa } = data;

  const totalRigs = +totals?.total_rigs || 0;
  const peakRigs = +totals?.peak_rigs || 0;
  const rigShare = totalRigs > 0 ? ((peakRigs / totalRigs) * 100).toFixed(1) : '0.0';

  const totalFrac = +fracTotals?.total_frac || 0;
  const peakFrac = +fracTotals?.peak_frac || 0;
  const totalJobs = +jobTotals?.total_jobs || 0;
  const peakJobs = +jobTotals?.peak_jobs || 0;

  const opChartData = byOperator
    .slice(0, opLimit)
    .map(r => ({
      name: r.operator_name?.length > 18 ? r.operator_name.slice(0, 16) + '…' : r.operator_name,
      fullName: r.operator_name,
      peak_rigs: +r.peak_rigs || 0,
      non_peak: (+r.total_rigs || 0) - (+r.peak_rigs || 0),
      total: +r.total_rigs || 0,
    }))
    .reverse();

  const countyChartData = byCounty.slice(0, 12).map(r => ({
    name: r.county?.length > 12 ? r.county.slice(0, 11) + '…' : r.county,
    fullName: r.county,
    peak_rigs: +r.peak_rigs || 0,
    non_peak: (+r.total_rigs || 0) - (+r.peak_rigs || 0),
    total: +r.total_rigs || 0,
  })).reverse();

  const basinChartData = byBasin.map(r => ({
    name: r.basin?.length > 14 ? r.basin.slice(0, 12) + '…' : r.basin,
    fullName: r.basin,
    peak_rigs: +r.peak_rigs || 0,
    non_peak: (+r.total_rigs || 0) - (+r.peak_rigs || 0),
    total: +r.total_rigs || 0,
  })).reverse();

  const activeMsa = byMsa.filter(r => r.msa_status === 'Active');
  const msaByStatus = ['Active', 'In Review', 'Not Started', 'Expired'].map(status => ({
    status,
    rows: byMsa.filter(r => r.msa_status === status),
  })).filter(g => g.rows.length > 0);

  const SECTIONS = [
    { key: 'overview', label: 'Overview' },
    { key: 'operators', label: 'By Operator' },
    { key: 'geography', label: 'By Geography' },
    { key: 'msa', label: 'By MSA' },
  ];

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Eagle Ford Basin · Territory CRM</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Tracking <strong>{totalRigs}</strong> total rigs · <strong>{totalFrac}</strong> frac sites · <strong>{totalJobs}</strong> job sites in market
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} style={{ flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--surface-2)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
        {SECTIONS.map(s => (
          <button key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              padding: '6px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeSection === s.key ? 'white' : 'transparent',
              color: activeSection === s.key ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeSection === s.key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s',
            }}
          >{s.label}</button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Market Rigs', value: totalRigs, sub: 'Active Eagle Ford rigs', color: '#1e3a5f' },
              { label: 'Peak Rigs', value: peakRigs, sub: `${rigShare}% market share`, color: PEAK_COLOR },
              { label: 'Remaining Opportunity', value: totalRigs - peakRigs, sub: 'Rigs not yet with Peak', color: '#64748b' },
              { label: 'Frac Sites', value: totalFrac, sub: `${pct(peakFrac, totalFrac)}% Peak penetration`, color: '#8b5cf6' },
              { label: 'Job Sites', value: totalJobs, sub: `${pct(peakJobs, totalJobs)}% Peak penetration`, color: '#0ea5e9' },
              { label: 'MSA Operators', value: activeMsa.length, sub: 'With Active MSA agreement', color: '#10b981' },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
                <div style={{ fontWeight: 800, fontSize: 30, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <DonutCard title="Rig Market Share" peakCount={peakRigs} totalCount={totalRigs} peakLabel="Peak Rigs" otherLabel="Non-Peak Rigs" color={PEAK_COLOR} />
            <DonutCard title="Frac Site Share" peakCount={peakFrac} totalCount={totalFrac} peakLabel="Peak Frac Sites" otherLabel="Non-Peak Sites" color="#8b5cf6" />
            <DonutCard title="Job Site Share" peakCount={peakJobs} totalCount={totalJobs} peakLabel="Peak Job Sites" otherLabel="Non-Peak Sites" color="#0ea5e9" />
            <div className="card" style={{ flex: 1, minWidth: 220, padding: '20px 20px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Potential Market</div>
              {[
                { label: 'Rigs', peak: peakRigs, total: totalRigs, color: PEAK_COLOR },
                { label: 'Frac Sites', peak: peakFrac, total: totalFrac, color: '#8b5cf6' },
                { label: 'Job Sites', peak: peakJobs, total: totalJobs, color: '#0ea5e9' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.peak} / {item.total}</span>
                  </div>
                  <ShareBar peak={item.peak} total={item.total} color={item.color} />
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 4 }}>
                {(() => {
                  const combinedPeak = peakRigs + peakFrac + peakJobs;
                  const combinedTotal = totalRigs + totalFrac + totalJobs;
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>Combined</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{combinedPeak} / {combinedTotal}</span>
                      </div>
                      <ShareBar peak={combinedPeak} total={combinedTotal} color="#1e3a5f" />
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Top Operators by Rig Count — Peak vs Market</span></div>
            <div style={{ padding: '12px 8px 4px' }}>
              {byOperator.length === 0
                ? <div className="empty-state"><p>No rig data available</p></div>
                : (
                  <ResponsiveContainer width="100%" height={Math.max(240, byOperator.slice(0, 10).length * 34)}>
                    <BarChart data={byOperator.slice(0, 10).map(r => ({
                      name: r.operator_name?.length > 20 ? r.operator_name.slice(0, 18) + '…' : r.operator_name,
                      fullName: r.operator_name,
                      peak_rigs: +r.peak_rigs || 0,
                      non_peak: (+r.total_rigs || 0) - (+r.peak_rigs || 0),
                    })).reverse()} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                      <CartesianGrid horizontal={false} stroke="var(--border-light)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="peak_rigs" name="Peak Rigs" stackId="a" fill={PEAK_COLOR} radius={[0,0,0,0]} />
                      <Bar dataKey="non_peak" name="Non-Peak" stackId="a" fill={MARKET_COLOR} radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'operators' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Show top</span>
              {[10, 15, 20, 25].map(n => (
                <button key={n} onClick={() => setOpLimit(n)} style={{
                  padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  background: opLimit === n ? 'var(--primary)' : 'transparent',
                  color: opLimit === n ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}>{n}</button>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>operators</span>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Market Share by Operator (Stacked)</span></div>
            <div style={{ padding: '12px 8px 4px' }}>
              {opChartData.length === 0
                ? <div className="empty-state"><p>No data</p></div>
                : (
                  <ResponsiveContainer width="100%" height={Math.max(300, opChartData.length * 36)}>
                    <BarChart data={opChartData} layout="vertical" margin={{ left: 8, right: 60, top: 4, bottom: 4 }}>
                      <CartesianGrid horizontal={false} stroke="var(--border-light)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="peak_rigs" name="Peak Rigs" stackId="a" fill={PEAK_COLOR} />
                      <Bar dataKey="non_peak" name="Non-Peak" stackId="a" fill={MARKET_COLOR} radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Operator Market Share Detail</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Showing {Math.min(opLimit, byOperator.length)} of {byOperator.length} operators</span>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>Operator</th>
                    <th style={{ textAlign: 'center' }}>Total Rigs</th>
                    <th style={{ textAlign: 'center' }}>Peak Rigs</th>
                    <th style={{ width: 200 }}>Peak Share</th>
                    <th style={{ textAlign: 'center' }}>Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  {byOperator.slice(0, opLimit).map((row, i) => {
                    const total = +row.total_rigs || 0;
                    const peak = +row.peak_rigs || 0;
                    const sharePct = total > 0 ? ((peak / total) * 100) : 0;
                    const opportunity = total - peak;
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{row.operator_name}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{total}</td>
                        <td style={{ textAlign: 'center' }}>
                          {peak > 0
                            ? <span style={{ fontWeight: 700, color: PEAK_COLOR }}>{peak}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
                              <div style={{ width: `${sharePct}%`, height: '100%', background: peak > 0 ? PEAK_COLOR : MARKET_COLOR, borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: peak > 0 ? PEAK_COLOR : 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
                              {sharePct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {opportunity > 0
                            ? <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>+{opportunity} rigs</span>
                            : <span style={{ color: '#10b981', fontWeight: 700, fontSize: 12 }}>✓ Full</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 24, fontSize: 12 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Market total: </span><strong>{totalRigs} rigs</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Peak total: </span><strong style={{ color: PEAK_COLOR }}>{peakRigs} rigs</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Overall share: </span><strong style={{ color: PEAK_COLOR }}>{rigShare}%</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Remaining opportunity: </span><strong>{totalRigs - peakRigs} rigs</strong></div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'geography' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">By County (Top 12)</span></div>
              <div style={{ padding: '12px 8px 4px' }}>
                {countyChartData.length === 0
                  ? <div className="empty-state" style={{ padding: 20 }}><p>No county data</p></div>
                  : (
                    <ResponsiveContainer width="100%" height={Math.max(260, countyChartData.length * 34)}>
                      <BarChart data={countyChartData} layout="vertical" margin={{ left: 4, right: 50, top: 4, bottom: 4 }}>
                        <CartesianGrid horizontal={false} stroke="var(--border-light)" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="peak_rigs" name="Peak Rigs" stackId="a" fill={PEAK_COLOR} />
                        <Bar dataKey="non_peak" name="Non-Peak" stackId="a" fill={MARKET_COLOR} radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">By Basin</span></div>
              <div style={{ padding: '12px 8px 4px' }}>
                {basinChartData.length === 0
                  ? <div className="empty-state" style={{ padding: 20 }}><p>No basin data</p></div>
                  : (
                    <ResponsiveContainer width="100%" height={Math.max(260, basinChartData.length * 50)}>
                      <BarChart data={basinChartData} layout="vertical" margin={{ left: 4, right: 50, top: 4, bottom: 4 }}>
                        <CartesianGrid horizontal={false} stroke="var(--border-light)" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="peak_rigs" name="Peak Rigs" stackId="a" fill={PEAK_COLOR} />
                        <Bar dataKey="non_peak" name="Non-Peak" stackId="a" fill={MARKET_COLOR} radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">County Market Share Detail</span></div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>County</th>
                    <th style={{ textAlign: 'center' }}>Total Rigs</th>
                    <th style={{ textAlign: 'center' }}>Peak</th>
                    <th style={{ width: 200 }}>Share</th>
                    <th style={{ textAlign: 'center' }}>Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {byCounty.map((row, i) => {
                    const total = +row.total_rigs || 0;
                    const peak = +row.peak_rigs || 0;
                    const sharePct = total > 0 ? (peak / total) * 100 : 0;
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{row.county}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{total}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: peak > 0 ? PEAK_COLOR : 'var(--text-muted)' }}>{peak || '—'}</td>
                        <td><ShareBar peak={peak} total={total} /></td>
                        <td style={{ textAlign: 'center' }}>
                          {total - peak > 0
                            ? <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>+{total - peak}</span>
                            : <span style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>✓</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'msa' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Active MSAs', value: byMsa.filter(r => r.msa_status === 'Active').length, color: '#10b981' },
              { label: 'In Review', value: byMsa.filter(r => r.msa_status === 'In Review').length, color: '#f59e0b' },
              { label: 'Not Started', value: byMsa.filter(r => r.msa_status === 'Not Started').length, color: '#64748b' },
              { label: 'Expired', value: byMsa.filter(r => r.msa_status === 'Expired').length, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '14px 20px', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ fontWeight: 800, fontSize: 28, color: s.color }}>{s.value}</div>
              </div>
            ))}
            {activeMsa.length > 0 && (
              <div className="card" style={{ padding: '14px 20px', flex: 2, minWidth: 200 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Peak Share (Active MSA Operators)</div>
                <div style={{ fontWeight: 800, fontSize: 28, color: PEAK_COLOR }}>
                  {(() => {
                    const tot = activeMsa.reduce((s, r) => s + (+r.total_rigs || 0), 0);
                    const pk = activeMsa.reduce((s, r) => s + (+r.peak_rigs || 0), 0);
                    return tot > 0 ? `${((pk / tot) * 100).toFixed(1)}%` : '—';
                  })()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>of rig market with MSA operators</div>
              </div>
            )}
          </div>

          {msaByStatus.map(group => (
            <div key={group.status} className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: MSA_COLORS[group.status]?.bg || '#f1f5f9',
                    color: MSA_COLORS[group.status]?.text || '#64748b',
                    border: `1px solid ${MSA_COLORS[group.status]?.border || '#e2e8f0'}`,
                  }}>{group.status}</span>
                  <span className="card-title">{group.rows.length} operators</span>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th style={{ textAlign: 'center' }}>Total Rigs</th>
                      <th style={{ textAlign: 'center' }}>Peak Rigs</th>
                      <th style={{ width: 220 }}>Rig Penetration</th>
                      <th style={{ textAlign: 'center' }}>Opportunity</th>
                      {group.status === 'Active' && <th>Signed</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, i) => {
                      const total = +row.total_rigs || 0;
                      const peak = +row.peak_rigs || 0;
                      const sharePct = total > 0 ? (peak / total) * 100 : 0;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{row.operator_name}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{total || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                          <td style={{ textAlign: 'center' }}>
                            {peak > 0
                              ? <span style={{ fontWeight: 700, color: PEAK_COLOR }}>{peak}</span>
                              : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td>
                            {total > 0
                              ? <ShareBar peak={peak} total={total} />
                              : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No rigs in market</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {total - peak > 0
                              ? <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: PEAK_LIGHT, color: '#c2410c', border: '1px solid #fed7aa', fontWeight: 600 }}>+{total - peak} rigs</span>
                              : total > 0
                                ? <span style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>✓ Full</span>
                                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                          </td>
                          {group.status === 'Active' && (
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {row.signed_date ? new Date(row.signed_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {byMsa.length === 0 && (
            <div className="empty-state">
              <p>No MSA data found. Add operators in the MSA Tracker to see their market share here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
