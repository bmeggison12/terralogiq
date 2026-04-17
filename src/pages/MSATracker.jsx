import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const MSA_STATUSES = ['Not Started','In Progress','In Review','Sent for Signature','Active','Expired','Terminated'];

const statusColors = {
  'Active': 'badge-green', 'In Review': 'badge-yellow', 'Expired': 'badge-red',
  'Not Started': 'badge-gray', 'In Progress': 'badge-blue', 'Sent for Signature': 'badge-purple', 'Terminated': 'badge-red'
};

export default function MSATracker() {
  const [msaList, setMsaList] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ operator_id: '', status: 'Not Started', signed_date: '', expiry_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [msa, ops] = await Promise.all([api.msa.list(), api.operators.list()]);
      setMsaList(msa);
      setOperators(ops);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ operator_id: '', status: 'Not Started', signed_date: '', expiry_date: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (msa) => {
    setEditing(msa);
    setForm({
      operator_id: msa.operator_id,
      status: msa.status,
      signed_date: msa.signed_date ? msa.signed_date.split('T')[0] : '',
      expiry_date: msa.expiry_date ? msa.expiry_date.split('T')[0] : '',
      notes: msa.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.msa.update(editing.id, form);
      else await api.msa.save(form);
      setShowModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const activeCount = msaList.filter(m => m.status === 'Active').length;
  const expiredCount = msaList.filter(m => m.status === 'Expired').length;
  const pendingCount = msaList.filter(m => ['In Progress','In Review','Sent for Signature'].includes(m.status)).length;

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 90;
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1>MSA Tracker</h1><p>Master Service Agreement status per operator</p></div>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add MSA Record
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Active MSAs', value: activeCount, color: 'green' },
          { label: 'Pending / In Review', value: pendingCount, color: 'orange' },
          { label: 'Expired', value: expiredCount, color: 'blue' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-content">
              <div className="value">{s.value}</div>
              <div className="label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">MSA Status by Operator ({msaList.length})</span></div>
        <div className="table-wrapper">
          {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
            <table>
              <thead><tr><th>Operator</th><th>Basin</th><th>MSA Status</th><th>Signed Date</th><th>Expiry Date</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {msaList.map(msa => (
                  <tr key={msa.id}>
                    <td style={{ fontWeight: 600 }}>{msa.operator_name}</td>
                    <td><span className="badge badge-blue">{msa.basin || '—'}</span></td>
                    <td>
                      <span className={`badge ${statusColors[msa.status] || 'badge-gray'}`}>{msa.status}</span>
                      {isExpiringSoon(msa.expiry_date) && <span className="badge badge-yellow" style={{ marginLeft: 6 }}>Expiring Soon</span>}
                    </td>
                    <td style={{ fontSize: 12 }}>{msa.signed_date ? new Date(msa.signed_date).toLocaleDateString() : '—'}</td>
                    <td style={{ fontSize: 12, color: isExpiringSoon(msa.expiry_date) ? 'var(--warning)' : '' }}>
                      {msa.expiry_date ? new Date(msa.expiry_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msa.notes || '—'}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openEdit(msa)}>Edit</button></td>
                  </tr>
                ))}
                {msaList.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No MSA records yet</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit MSA Record' : 'Add MSA Record'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Operator *</label>
            <select className="form-control" value={form.operator_id || ''} onChange={e => setForm({...form, operator_id: e.target.value})} required>
              <option value="">Select Operator</option>
              {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              {MSA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Signed Date</label>
              <input className="form-control" type="date" value={form.signed_date || ''} onChange={e => setForm({...form, signed_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input className="form-control" type="date" value={form.expiry_date || ''} onChange={e => setForm({...form, expiry_date: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-control" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
