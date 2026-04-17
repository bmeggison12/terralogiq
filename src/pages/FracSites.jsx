import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const STATUSES = ['Active', 'Completed', 'Planned', 'On Hold'];

const STATUS_STYLE = {
  Active:    { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  Completed: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  Planned:   { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  'On Hold': { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Active'];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

const empty = { operator_id: '', site_name: '', county: '', state: 'TX', latitude: '', longitude: '', status: 'Active', total_wells: '', active_wells: '', notes: '', is_peak_site: false, frac_date: '' };

export default function FracSites() {
  const [sites, setSites] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [peakFilter, setPeakFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const [s, ops] = await Promise.all([api.fracSites.list(params), api.operators.list()]);
      setSites(s);
      setOperators(ops);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ ...s, frac_date: s.frac_date ? s.frac_date.split('T')[0] : '', operator_id: s.operator_id || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.fracSites.update(editing.id, form);
      else await api.fracSites.create(form);
      setShowModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this frac site?')) return;
    await api.fracSites.delete(id);
    load();
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) { setUploadStatus({ type: 'error', msg: 'Please upload a CSV file' }); return; }
    setUploading(true);
    setUploadStatus(null);
    try {
      const result = await api.fracSites.uploadCSV(file);
      setUploadStatus({ type: 'success', msg: result.message });
      load();
    } catch (err) { setUploadStatus({ type: 'error', msg: err.message }); }
    finally { setUploading(false); }
  };

  const filtered = peakFilter ? sites.filter(s => s.is_peak_site) : sites;

  const totalSites = filtered.length;
  const peakSites = filtered.filter(s => s.is_peak_site).length;
  const activeSites = filtered.filter(s => s.status === 'Active').length;
  const totalWells = filtered.reduce((sum, s) => sum + (parseInt(s.total_wells) || 0), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1>Frac Sites</h1><p>Track hydraulic fracturing locations and Peak equipment deployments</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setActiveTab(activeTab === 'upload' ? 'list' : 'upload')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Enverus CSV
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Frac Site
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Sites', value: totalSites, color: 'blue', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
          { label: 'Active Sites', value: activeSites, color: 'green', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg> },
          { label: 'Peak Sites', value: peakSites, color: 'orange', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
          { label: 'Total Wells', value: totalWells, color: 'purple', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg> },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
            <div className="stat-content">
              <div className="value">{stat.value}</div>
              <div className="label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'upload' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Upload Enverus Frac Site Data</span>
            <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('list')}>Close</button>
          </div>
          <div className="card-body">
            {uploadStatus && (
              <div className={`alert alert-${uploadStatus.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
                {uploadStatus.msg}
              </div>
            )}
            <div
              className={`file-upload-zone ${dragOver ? 'drag-over' : ''}`}
              style={{ marginBottom: 16 }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current.click()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{uploading ? 'Importing...' : 'Click or drop CSV file here'}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enverus frac/completion data CSV format</p>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
            <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Recognized columns from Enverus exports:</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Well Name', 'Operator', 'County', 'State', 'Latitude', 'Longitude', 'Spud Date', 'Frac Date', 'County/Parish'].map(c => (
                  <span key={c} className="badge badge-blue">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <div className="search-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search sites, operators, counties..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={peakFilter} onChange={e => setPeakFilter(e.target.checked)} />
          Peak sites only
        </label>
        {(search || statusFilter || peakFilter) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setPeakFilter(false); }}>Clear</button>
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
                  <th>Operator</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Wells</th>
                  <th>Frac Date</th>
                  <th>Source</th>
                  <th>Peak Site</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(site => (
                  <tr key={site.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{site.site_name}</div>
                      {site.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.notes}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{site.operator_name || '—'}</td>
                    <td>
                      <div style={{ fontSize: 12 }}>{[site.county, site.state].filter(Boolean).join(', ') || '—'}</div>
                      {site.latitude && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{parseFloat(site.latitude).toFixed(4)}, {parseFloat(site.longitude).toFixed(4)}</div>}
                    </td>
                    <td><StatusBadge status={site.status} /></td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 700 }}>{site.active_wells || 0}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / {site.total_wells || 0}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>active / total</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {site.frac_date ? new Date(site.frac_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className={`badge ${site.source === 'Enverus' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {site.source || 'Manual'}
                      </span>
                    </td>
                    <td>
                      {site.is_peak_site ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 100, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 11, fontWeight: 700 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          Peak
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(site)}>Edit</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleDelete(site.id)} style={{ color: 'var(--danger)' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9}>
                    <div className="empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      <p>No frac sites yet. Add one manually or upload an Enverus CSV.</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Frac Site' : 'Add Frac Site'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Site Name *</label>
              <input className="form-control" value={form.site_name} onChange={e => setForm({ ...form, site_name: e.target.value })} required placeholder="e.g. NELSON A-CASKEY A SA 3" />
            </div>
            <div className="form-group">
              <label className="form-label">Operator</label>
              <select className="form-control" value={form.operator_id} onChange={e => setForm({ ...form, operator_id: e.target.value })}>
                <option value="">— Select Operator —</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
              <input className="form-control" type="number" step="any" value={form.latitude || ''} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="29.0113" />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input className="form-control" type="number" step="any" value={form.longitude || ''} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="-97.6683" />
            </div>
            <div className="form-group">
              <label className="form-label">Total Wells</label>
              <input className="form-control" type="number" min="0" value={form.total_wells || ''} onChange={e => setForm({ ...form, total_wells: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Active Wells</label>
              <input className="form-control" type="number" min="0" value={form.active_wells || ''} onChange={e => setForm({ ...form, active_wells: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Frac Date</label>
              <input className="form-control" type="date" value={form.frac_date || ''} onChange={e => setForm({ ...form, frac_date: e.target.value })} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
              <input type="checkbox" id="isPeakSite" checked={form.is_peak_site} onChange={e => setForm({ ...form, is_peak_site: e.target.checked })} />
              <label htmlFor="isPeakSite" style={{ fontSize: 13, cursor: 'pointer', fontWeight: 600, color: 'var(--warning)' }}>Peak Site</label>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-control" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
