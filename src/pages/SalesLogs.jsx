import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const METHODS = ['Phone Call','Site Visit','Email','Meeting','Video Call','Text','Other'];
const emptyForm = { operator_id: '', rig_id: '', log_date: new Date().toISOString().split('T')[0], contact_method: 'Phone Call', notes: '', competitor_equipment: '', next_steps: '' };

export default function SalesLogs() {
  const [logs, setLogs] = useState([]);
  const [operators, setOperators] = useState([]);
  const [rigs, setRigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ operator_id: '', from_date: '', to_date: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.operator_id) params.operator_id = filters.operator_id;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      const [l, ops] = await Promise.all([api.salesLogs.list(params), api.operators.list()]);
      setLogs(l);
      setOperators(ops);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const loadRigs = async (operatorId) => {
    if (!operatorId) { setRigs([]); return; }
    const r = await api.rigs.list({ operator_id: operatorId });
    setRigs(r);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setRigs([]); setShowModal(true); };
  const openEdit = (log) => {
    setEditing(log);
    setForm({ ...log, log_date: log.log_date ? log.log_date.split('T')[0] : new Date().toISOString().split('T')[0] });
    loadRigs(log.operator_id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.salesLogs.update(editing.id, form);
      else await api.salesLogs.create(form);
      setShowModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this log entry?')) return;
    await api.salesLogs.delete(id);
    load();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1>Sales Logs</h1><p>Daily field activity entries and contact records</p></div>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Activity
        </button>
      </div>

      <div className="filters-bar">
        <select className="form-control" style={{ width: 180 }} value={filters.operator_id} onChange={e => setFilters({...filters, operator_id: e.target.value})}>
          <option value="">All Operators</option>
          {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input className="form-control" type="date" style={{ width: 150 }} value={filters.from_date} onChange={e => setFilters({...filters, from_date: e.target.value})} placeholder="From date" />
          <span style={{ color: 'var(--text-muted)' }}>—</span>
          <input className="form-control" type="date" style={{ width: 150 }} value={filters.to_date} onChange={e => setFilters({...filters, to_date: e.target.value})} placeholder="To date" />
        </div>
        {(filters.operator_id || filters.from_date || filters.to_date) && (
          <button className="btn btn-outline btn-sm" onClick={() => setFilters({ operator_id: '', from_date: '', to_date: '' })}>Clear</button>
        )}
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Activity Log ({logs.length} entries)</span></div>
        <div className="table-wrapper">
          {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
            <table>
              <thead><tr><th>Date</th><th>Operator</th><th>Rig</th><th>Method</th><th>Notes</th><th>Next Steps</th><th>By</th><th></th></tr></thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 500 }}>{log.operator_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.rig_name || '—'}</td>
                    <td><span className="badge badge-blue">{log.contact_method}</span></td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                      <span title={log.notes}>{log.notes || '—'}</span>
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--accent)' }}>{log.next_steps || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.user_name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(log)}>Edit</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleDelete(log.id)} style={{ color: 'var(--danger)' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={8}><div className="empty-state"><p>No activity logged yet</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Activity Log' : 'Log New Activity'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Log'}</button>
        </>}>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Operator *</label>
              <select className="form-control" value={form.operator_id || ''} onChange={e => { setForm({...form, operator_id: e.target.value, rig_id: ''}); loadRigs(e.target.value); }} required>
                <option value="">Select Operator</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Rig (optional)</label>
              <select className="form-control" value={form.rig_id || ''} onChange={e => setForm({...form, rig_id: e.target.value || null})}>
                <option value="">No specific rig</option>
                {rigs.map(r => <option key={r.id} value={r.id}>{r.rig_name || r.rig_number}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-control" type="date" value={form.log_date} onChange={e => setForm({...form, log_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Method</label>
              <select className="form-control" value={form.contact_method} onChange={e => setForm({...form, contact_method: e.target.value})}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-control" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={3} placeholder="What was discussed?" />
          </div>
          <div className="form-group">
            <label className="form-label">Competitor Equipment</label>
            <input className="form-control" value={form.competitor_equipment || ''} onChange={e => setForm({...form, competitor_equipment: e.target.value})} placeholder="Any competitor equipment observed?" />
          </div>
          <div className="form-group">
            <label className="form-label">Next Steps</label>
            <textarea className="form-control" value={form.next_steps || ''} onChange={e => setForm({...form, next_steps: e.target.value})} rows={2} placeholder="What needs to happen next?" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
