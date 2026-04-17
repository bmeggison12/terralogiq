import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const STAGES = ['Identified','Contacted','Visited','Pricing','MSA','Won','Lost'];

const stageColors = {
  Identified: '#94a3b8', Contacted: '#0891b2', Visited: '#7c3aed',
  Pricing: '#ca8a04', MSA: '#ea580c', Won: '#16a34a', Lost: '#dc2626'
};

function formatCurrency(v) {
  if (!v) return '$0';
  const n = parseFloat(v);
  if (n >= 1000000) return '$' + (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n/1000).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

const EQUIPMENT_TYPES = ['Frac Stack', 'Wellhead', 'Water Management', 'Flowback', 'Pressure Control', 'Other'];

const emptyForm = { operator_id: '', title: '', stage: 'Identified', value: '', description: '', expected_close_date: '', probability: '', equipment_type: '', competitor_on_site: '', follow_up_date: '' };

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [stageFilter, setStageFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [opps, ops] = await Promise.all([api.opportunities.list(), api.operators.list()]);
      setOpportunities(opps);
      setOperators(ops);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (opp) => {
    setEditing(opp);
    setForm({
      ...opp,
      expected_close_date: opp.expected_close_date ? opp.expected_close_date.split('T')[0] : '',
      follow_up_date: opp.follow_up_date ? opp.follow_up_date.split('T')[0] : '',
      probability: opp.probability ?? '',
      equipment_type: opp.equipment_type || '',
      competitor_on_site: opp.competitor_on_site || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.opportunities.update(editing.id, form);
      else await api.opportunities.create(form);
      setShowModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this opportunity?')) return;
    await api.opportunities.delete(id);
    load();
  };

  const filteredOpps = stageFilter ? opportunities.filter(o => o.stage === stageFilter) : opportunities;
  const totalValue = opportunities.filter(o => o.stage !== 'Lost').reduce((s, o) => s + parseFloat(o.value || 0), 0);
  const wonValue = opportunities.filter(o => o.stage === 'Won').reduce((s, o) => s + parseFloat(o.value || 0), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Opportunities</h1>
          <p>Track your sales pipeline from identification to close</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${view === 'kanban' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('kanban')}>Kanban</button>
          <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('list')}>List</button>
          <button className="btn btn-accent" onClick={openCreate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Opportunity
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Pipeline', value: formatCurrency(totalValue), sub: `${opportunities.filter(o => o.stage !== 'Lost' && o.stage !== 'Won').length} open` },
          { label: 'Won', value: formatCurrency(wonValue), sub: `${opportunities.filter(o => o.stage === 'Won').length} deals closed` },
          { label: 'In Progress', value: opportunities.filter(o => !['Won','Lost','Identified'].includes(o.stage)).length, sub: 'Active deals' },
          { label: 'Win Rate', value: opportunities.length > 0 ? Math.round((opportunities.filter(o => o.stage === 'Won').length / opportunities.filter(o => ['Won','Lost'].includes(o.stage)).length) * 100 || 0) + '%' : '—', sub: 'Closed deals' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {view === 'kanban' ? (
        <>
          {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
            <div className="pipeline-stages">
              {STAGES.map(stage => {
                const stageOpps = opportunities.filter(o => o.stage === stage);
                const stageValue = stageOpps.reduce((s, o) => s + parseFloat(o.value || 0), 0);
                return (
                  <div key={stage} className="pipeline-stage">
                    <div className="stage-header">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className="stage-name" style={{ color: stageColors[stage] }}>{stage}</span>
                        {stageValue > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatCurrency(stageValue)}</span>}
                      </div>
                      <span className="stage-count" style={{ background: stageColors[stage] }}>{stageOpps.length}</span>
                    </div>
                    {stageOpps.map(opp => (
                      <div key={opp.id} className="stage-card" onClick={() => openEdit(opp)}>
                        <div className="opp-title">{opp.title}</div>
                        <div className="opp-meta">{opp.operator_name}</div>
                        {opp.equipment_type && <div className="opp-meta" style={{ marginTop: 2 }}>📦 {opp.equipment_type}</div>}
                        {opp.competitor_on_site && <div className="opp-meta" style={{ marginTop: 2, color: '#dc2626' }}>⚠ {opp.competitor_on_site}</div>}
                        {opp.expected_close_date && <div className="opp-meta" style={{ marginTop: 2 }}>Close: {new Date(opp.expected_close_date).toLocaleDateString()}</div>}
                        {opp.follow_up_date && <div className="opp-meta" style={{ marginTop: 2, color: '#d97706' }}>🔔 {new Date(opp.follow_up_date).toLocaleDateString()}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                          <div className="opp-value">{formatCurrency(opp.value)}</div>
                          {opp.probability != null && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: opp.probability >= 70 ? '#dcfce7' : opp.probability >= 40 ? '#fef9c3' : '#fee2e2', color: opp.probability >= 70 ? '#15803d' : opp.probability >= 40 ? '#854d0e' : '#dc2626' }}>
                              {opp.probability}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {stageOpps.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No opportunities</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Opportunities ({filteredOpps.length})</span>
            <select className="form-control" style={{ width: 140 }} value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
              <option value="">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="table-wrapper">
            {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
              <table>
                <thead><tr><th>Title</th><th>Operator</th><th>Stage</th><th>Value</th><th>Close Date</th><th>Assigned To</th><th></th></tr></thead>
                <tbody>
                  {filteredOpps.map(opp => (
                    <tr key={opp.id}>
                      <td style={{ fontWeight: 600 }}>{opp.title}</td>
                      <td>{opp.operator_name}</td>
                      <td><span className="badge" style={{ background: stageColors[opp.stage] + '22', color: stageColors[opp.stage] }}>{opp.stage}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(opp.value)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '—'}</td>
                      <td>{opp.assigned_to_name || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(opp)}>Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => handleDelete(opp.id)} style={{ color: 'var(--danger)' }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOpps.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No opportunities found</p></div></td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Opportunity' : 'New Opportunity'}
        footer={<>
          {editing && <button className="btn btn-danger btn-sm" onClick={() => { handleDelete(editing.id); setShowModal(false); }}>Delete</button>}
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Operator *</label>
              <select className="form-control" value={form.operator_id || ''} onChange={e => setForm({...form, operator_id: e.target.value})} required>
                <option value="">Select Operator</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="form-control" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Value ($)</label>
              <input className="form-control" type="number" value={form.value || ''} onChange={e => setForm({...form, value: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Expected Close Date</label>
              <input className="form-control" type="date" value={form.expected_close_date || ''} onChange={e => setForm({...form, expected_close_date: e.target.value})} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Win Probability (%)</label>
              <input className="form-control" type="number" min="0" max="100" placeholder="0–100" value={form.probability || ''} onChange={e => setForm({...form, probability: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Follow-up Date</label>
              <input className="form-control" type="date" value={form.follow_up_date || ''} onChange={e => setForm({...form, follow_up_date: e.target.value})} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Equipment Package Type</label>
              <select className="form-control" value={form.equipment_type || ''} onChange={e => setForm({...form, equipment_type: e.target.value})}>
                <option value="">Select type…</option>
                {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Competitor On-Site</label>
              <input className="form-control" placeholder="Competitor name / equipment" value={form.competitor_on_site || ''} onChange={e => setForm({...form, competitor_on_site: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
