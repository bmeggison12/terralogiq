import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const SITE_STATUSES = ['Active', 'Completed', 'Planned', 'Standby', 'On Hold'];

const STATUS_STYLE = {
  Active:    { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  Completed: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  Planned:   { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  Standby:   { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'On Hold': { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
};

function TypeBadge({ name, color }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
      background: color + '22', color: color, border: `1px solid ${color}55`,
      whiteSpace: 'nowrap'
    }}>
      {name}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Active'];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

const COLORS = ['#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];

function ManageTypesModal({ types, onClose, onChanged }) {
  const [list, setList] = useState(types);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const startEdit = (t) => { setEditingId(t.id); setEditName(t.name); setEditColor(t.color || COLORS[0]); };
  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const updated = await api.jobSites.updateType(id, { name: editName.trim(), color: editColor });
      setList(prev => prev.map(t => t.id === id ? updated : t));
      setEditingId(null);
      onChanged();
    } finally { setSaving(false); }
  };

  const deleteType = async (id) => {
    if (!confirm('Delete this site type? Existing sites using it will lose their type.')) return;
    await api.jobSites.deleteType(id);
    setList(prev => prev.filter(t => t.id !== id));
    onChanged();
  };

  const addType = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await api.jobSites.createType({ name: newName.trim(), color: newColor });
      setList(prev => [...prev, created]);
      setNewName('');
      setNewColor(COLORS[(list.length + 1) % COLORS.length]);
      onChanged();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minWidth: 420 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Add, rename, or remove job site types. These appear as options when creating a new site.
      </p>

      <div style={{ marginBottom: 16 }}>
        {list.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
            {editingId === t.id ? (
              <>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: editColor, flexShrink: 0, border: '2px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => {
                    const next = COLORS[(COLORS.indexOf(editColor) + 1) % COLORS.length];
                    setEditColor(next);
                  }}
                  title="Click to cycle color"
                />
                <input
                  className="form-control"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(t.id); if (e.key === 'Escape') cancelEdit(); }}
                  autoFocus
                  style={{ flex: 1, fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setEditColor(c)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: editColor === c ? '2px solid var(--text-primary)' : '2px solid transparent', flexShrink: 0 }} />
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => saveEdit(t.id)} disabled={saving}>Save</button>
                <button className="btn btn-outline btn-sm" onClick={cancelEdit}>✕</button>
              </>
            ) : (
              <>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: t.color || '#6366f1', flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => startEdit(t)}>Rename</button>
                <button className="btn btn-outline btn-sm" style={{ fontSize: 11, color: 'var(--danger)' }} onClick={() => deleteType(t.id)}>Delete</button>
              </>
            )}
          </div>
        ))}
        {list.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No types yet</p>}
      </div>

      <form onSubmit={addType} style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Add New Type</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input
            className="form-control"
            placeholder="Type name (e.g. Flowback)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1, fontSize: 13 }}
            required
          />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Color:</span>
          {COLORS.map(c => (
            <div key={c} onClick={() => setNewColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', border: newColor === c ? '2px solid var(--text-primary)' : '2px solid transparent', flexShrink: 0 }} />
          ))}
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !newName.trim()}>
          + Add Type
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button className="btn btn-outline" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

const emptyForm = { operator_id: '', site_type_id: '', site_name: '', county: '', state: 'TX', latitude: '', longitude: '', status: 'Active', wells_count: '', notes: '', is_peak_site: false, job_date: '' };

export default function JobSites() {
  const [sites, setSites] = useState([]);
  const [types, setTypes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [peakFilter, setPeakFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter) params.site_type_id = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const [s, t, ops] = await Promise.all([
        api.jobSites.list(params),
        api.jobSites.listTypes(),
        api.operators.list(),
      ]);
      setSites(s);
      setTypes(t);
      setOperators(ops);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, typeFilter, statusFilter]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ ...s, job_date: s.job_date ? s.job_date.split('T')[0] : '', operator_id: s.operator_id || '', site_type_id: s.site_type_id || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.jobSites.update(editing.id, form);
      else await api.jobSites.create(form);
      setShowModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this job site?')) return;
    await api.jobSites.delete(id);
    load();
  };

  const filtered = peakFilter ? sites.filter(s => s.is_peak_site) : sites;

  const totalSites = filtered.length;
  const peakSites = filtered.filter(s => s.is_peak_site).length;
  const activeSites = filtered.filter(s => s.status === 'Active').length;
  const typeCounts = types.map(t => ({
    ...t,
    count: filtered.filter(s => s.site_type_id === t.id).length
  }));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Job Sites</h1>
          <p>Track all wellsite jobs — flowback, production, coil tubing, and more</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowTypesModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.41 13.5M4.93 4.93A10 10 0 0 0 3.52 18.43"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
            Manage Types
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Job Site
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
          <div className="stat-content"><div className="value">{totalSites}</div><div className="label">Total Sites</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg></div>
          <div className="stat-content"><div className="value">{activeSites}</div><div className="label">Active</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          <div className="stat-content"><div className="value">{peakSites}</div><div className="label">Peak Sites</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
          <div className="stat-content"><div className="value">{types.length}</div><div className="label">Job Types</div></div>
        </div>
      </div>

      {types.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {typeCounts.map(t => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(typeFilter === String(t.id) ? '' : String(t.id))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 100, border: `1.5px solid ${t.color}`,
                background: typeFilter === String(t.id) ? t.color : 'transparent',
                color: typeFilter === String(t.id) ? 'white' : t.color,
                fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: typeFilter === String(t.id) ? 'white' : t.color, flexShrink: 0 }} />
              {t.name}
              <span style={{ fontWeight: 400, opacity: 0.8 }}>({t.count})</span>
            </button>
          ))}
          {typeFilter && <button className="btn btn-outline btn-sm" onClick={() => setTypeFilter('')} style={{ fontSize: 11 }}>Clear</button>}
        </div>
      )}

      <div className="filters-bar">
        <div className="search-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search sites, operators, counties..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {SITE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={peakFilter} onChange={e => setPeakFilter(e.target.checked)} />
          Peak sites only
        </label>
        {(search || statusFilter || peakFilter) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setPeakFilter(false); }}>Clear all</button>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} sites</span>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
            <table>
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>Type</th>
                  <th>Operator</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Wells</th>
                  <th>Job Date</th>
                  <th>Peak</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(site => (
                  <tr key={site.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{site.site_name}</div>
                      {site.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.notes}</div>}
                    </td>
                    <td>
                      {site.site_type_name
                        ? <TypeBadge name={site.site_type_name} color={site.site_type_color || '#6366f1'} />
                        : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12 }}>{site.operator_name || '—'}</td>
                    <td>
                      <div style={{ fontSize: 12 }}>{[site.county, site.state].filter(Boolean).join(', ') || '—'}</div>
                      {site.latitude && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{parseFloat(site.latitude).toFixed(4)}, {parseFloat(site.longitude).toFixed(4)}</div>}
                    </td>
                    <td><StatusBadge status={site.status} /></td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{site.wells_count || 0}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {site.job_date ? new Date(site.job_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {site.is_peak_site ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 100, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 11, fontWeight: 700 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          Peak
                        </span>
                      ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(site)}>Edit</button>
                        <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(site.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9}>
                    <div className="empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <p>No job sites yet. Click "Add Job Site" to get started.</p>
                      {types.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Use "Manage Types" to create job types like Flowback, Production, Coil Tubing, etc.</p>}
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Job Site' : 'Add Job Site'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Site Name *</label>
              <input className="form-control" value={form.site_name} onChange={e => setForm({ ...form, site_name: e.target.value })} required placeholder="e.g. EOG SMITH 1H — Flowback" />
            </div>
            <div className="form-group">
              <label className="form-label">Job Type</label>
              <select className="form-control" value={form.site_type_id} onChange={e => setForm({ ...form, site_type_id: e.target.value })}>
                <option value="">— Select Type —</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div style={{ marginTop: 4 }}>
                <button type="button" style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--primary)', cursor: 'pointer', padding: 0 }} onClick={() => { setShowModal(false); setShowTypesModal(true); }}>
                  + Manage types
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {SITE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Operator</label>
              <select className="form-control" value={form.operator_id} onChange={e => setForm({ ...form, operator_id: e.target.value })}>
                <option value="">— Select Operator —</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Job Date</label>
              <input className="form-control" type="date" value={form.job_date || ''} onChange={e => setForm({ ...form, job_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">County</label>
              <input className="form-control" value={form.county || ''} onChange={e => setForm({ ...form, county: e.target.value })} placeholder="e.g. DeWitt" />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-control" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="TX" />
            </div>
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input className="form-control" type="number" step="any" value={form.latitude || ''} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="29.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input className="form-control" type="number" step="any" value={form.longitude || ''} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="-97.66" />
            </div>
            <div className="form-group">
              <label className="form-label">Wells Count</label>
              <input className="form-control" type="number" min="0" value={form.wells_count || ''} onChange={e => setForm({ ...form, wells_count: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
              <input type="checkbox" id="isPeakSite" checked={form.is_peak_site} onChange={e => setForm({ ...form, is_peak_site: e.target.checked })} />
              <label htmlFor="isPeakSite" style={{ fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#ea580c' }}>Peak Site</label>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-control" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Equipment on site, job details, contacts..." />
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showTypesModal} onClose={() => { setShowTypesModal(false); load(); }} title="Manage Job Site Types">
        <ManageTypesModal
          types={types}
          onClose={() => { setShowTypesModal(false); load(); }}
          onChanged={load}
        />
      </Modal>
    </div>
  );
}
