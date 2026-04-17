import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';

const TYPES = ['Call', 'Text', 'Email', 'Meeting', 'Site Visit', 'Other'];

const TYPE_ICONS = {
  'Call': '📞',
  'Text': '💬',
  'Email': '✉️',
  'Meeting': '🤝',
  'Site Visit': '🏭',
  'Other': '📝',
};

const TYPE_COLORS = {
  'Call':       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Text':       { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Email':      { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'Meeting':    { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  'Site Visit': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'Other':      { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const emptyForm = {
  operator_id: '', contact_id: '', activity_type: 'Call',
  subject: '', notes: '', activity_date: new Date().toISOString().slice(0, 16),
  follow_up_date: '', follow_up_notes: '', is_completed: false
};

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [operators, setOperators] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (tab === 'due_today') params.due_today = 'true';
      if (tab === 'overdue') params.overdue = 'true';
      if (tab === 'completed') params.completed = 'true';
      const [acts, st, ops] = await Promise.all([
        api.activities.list(params),
        api.activities.stats(),
        api.operators.list()
      ]);
      setActivities(acts);
      setStats(st);
      setOperators(ops);
    } finally { setLoading(false); }
  }, [tab, typeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (form.operator_id) {
      api.contacts.list({ operator_id: form.operator_id }).then(setContacts).catch(() => setContacts([]));
    } else {
      setContacts([]);
    }
  }, [form.operator_id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, activity_date: new Date().toISOString().slice(0, 16) });
    setShowModal(true);
  };

  const openEdit = (act) => {
    setEditing(act);
    setForm({
      operator_id: act.operator_id || '',
      contact_id: act.contact_id || '',
      activity_type: act.activity_type || 'Call',
      subject: act.subject || '',
      notes: act.notes || '',
      activity_date: act.activity_date ? new Date(act.activity_date).toISOString().slice(0, 16) : '',
      follow_up_date: act.follow_up_date ? act.follow_up_date.split('T')[0] : '',
      follow_up_notes: act.follow_up_notes || '',
      is_completed: act.is_completed || false,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.activity_type) return;
    setSaving(true);
    try {
      if (editing) await api.activities.update(editing.id, form);
      else await api.activities.create(form);
      setShowModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleComplete = async (act) => {
    setCompleting(act.id);
    try {
      await api.activities.complete(act.id, !act.is_completed);
      load();
    } finally { setCompleting(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this activity?')) return;
    await api.activities.delete(id);
    load();
  };

  const filtered = activities.filter(a => {
    if (operatorFilter && String(a.operator_id) !== String(operatorFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!((a.subject || '').toLowerCase().includes(q) ||
            (a.operator_name || '').toLowerCase().includes(q) ||
            (a.contact_name || '').toLowerCase().includes(q) ||
            (a.notes || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const urgencyStyle = (a) => {
    if (a.is_completed) return { color: '#16a34a' };
    if (!a.follow_up_date) return {};
    const d = new Date(a.follow_up_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    if (d < now) return { color: '#dc2626', fontWeight: 700 };
    if (d.getTime() === now.getTime()) return { color: '#d97706', fontWeight: 700 };
    return {};
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Activities</h1>
          <p>Log and track all sales interactions — calls, texts, emails, meetings, and site visits</p>
        </div>
        <button className="btn btn-accent" onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Activity
        </button>
      </div>

      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Total Activities', value: stats.total, color: 'blue' },
            { label: 'This Week', value: stats.this_week, color: 'teal' },
            { label: 'Due Today', value: stats.due_today, color: 'orange', alert: stats.due_today > 0 },
            { label: 'Overdue', value: stats.overdue, color: 'red', alert: stats.overdue > 0 },
            { label: 'Completed', value: stats.completed, color: 'green' },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ padding: 14, borderLeft: s.alert ? '3px solid #dc2626' : undefined }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.alert ? '#dc2626' : undefined }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'due_today', label: `Due Today${stats?.due_today ? ` (${stats.due_today})` : ''}` },
              { key: 'overdue', label: `Overdue${stats?.overdue ? ` (${stats.overdue})` : ''}` },
              { key: 'completed', label: 'Completed' },
            ].map(t => (
              <button key={t.key}
                className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline'}`}
                style={t.key === 'overdue' && stats?.overdue > 0 ? { borderColor: '#dc2626', color: tab === t.key ? undefined : '#dc2626' } : {}}
                onClick={() => setTab(t.key)}
              >{t.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <input
              className="form-control" style={{ width: 180 }}
              placeholder="Search…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <select className="form-control" style={{ width: 140 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
            </select>
            <select className="form-control" style={{ width: 160 }} value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)}>
              <option value="">All Operators</option>
              {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"/>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{tab === 'all' ? 'No activities logged yet — click "Log Activity" to get started.' : 'No activities in this view.'}</p>
          </div>
        ) : (
          <div>
            {filtered.map(act => {
              const tc = TYPE_COLORS[act.activity_type] || TYPE_COLORS['Other'];
              const isOverdue = act.follow_up_date && !act.is_completed && new Date(act.follow_up_date) < new Date(new Date().setHours(0,0,0,0));
              return (
                <div key={act.id} style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  opacity: act.is_completed ? 0.65 : 1,
                  background: isOverdue ? '#fff5f5' : undefined,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, background: tc.bg, border: `1px solid ${tc.border}`,
                  }}>
                    {TYPE_ICONS[act.activity_type] || '📝'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        textDecoration: act.is_completed ? 'line-through' : undefined,
                        color: act.is_completed ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {act.subject || act.activity_type}
                      </span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, fontWeight: 600 }}>
                        {act.activity_type}
                      </span>
                      {act.is_completed && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 600 }}>
                          ✓ Done
                        </span>
                      )}
                      {isOverdue && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 700 }}>
                          ⚠ Overdue
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {act.operator_name && <span>🏢 {act.operator_name}</span>}
                      {act.contact_name && <span>👤 {act.contact_name}{act.contact_title ? ` · ${act.contact_title}` : ''}</span>}
                      <span>📅 {formatDateTime(act.activity_date)}</span>
                      {act.user_name && <span>👤 {act.user_name}</span>}
                    </div>
                    {act.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 600 }}>
                        {act.notes}
                      </div>
                    )}
                    {act.follow_up_date && (
                      <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, background: isOverdue ? '#fee2e2' : '#fff7ed', border: `1px solid ${isOverdue ? '#fca5a5' : '#fde68a'}` }}>
                        <span style={{ fontSize: 11, ...urgencyStyle(act) }}>
                          🔔 Follow-up: {formatDate(act.follow_up_date)}
                          {act.follow_up_notes && ` — ${act.follow_up_notes}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm"
                      disabled={completing === act.id}
                      onClick={() => handleComplete(act)}
                      style={{
                        background: act.is_completed ? '#fee2e2' : '#dcfce7',
                        color: act.is_completed ? '#dc2626' : '#15803d',
                        border: `1px solid ${act.is_completed ? '#fca5a5' : '#86efac'}`,
                        fontSize: 11, fontWeight: 600, padding: '4px 10px',
                      }}
                    >
                      {completing === act.id ? '…' : act.is_completed ? 'Reopen' : '✓ Done'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(act)}>Edit</button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(act.id)}>Del</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Activity' : 'Log Activity'}
        footer={<>
          {editing && <button className="btn btn-danger btn-sm" onClick={() => { handleDelete(editing.id); setShowModal(false); }}>Delete</button>}
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}
      >
        <form onSubmit={handleSave}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Activity Type *</label>
              <select className="form-control" value={form.activity_type} onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))} required>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input className="form-control" type="datetime-local" value={form.activity_date} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-control" placeholder="Brief summary of the interaction…" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Operator</label>
              <select className="form-control" value={form.operator_id} onChange={e => setForm(f => ({ ...f, operator_id: e.target.value, contact_id: '' }))}>
                <option value="">Select Operator</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contact</label>
              <select className="form-control" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))} disabled={!form.operator_id}>
                <option value="">{form.operator_id ? 'Select Contact (optional)' : 'Select operator first'}</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.title ? ` — ${c.title}` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={3} placeholder="What was discussed? Any key takeaways?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div style={{ padding: '12px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 10 }}>🔔 Follow-up Reminder</div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Follow-up Date</label>
                <input className="form-control" type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Follow-up Notes</label>
                <input className="form-control" placeholder="What needs to happen next?" value={form.follow_up_notes} onChange={e => setForm(f => ({ ...f, follow_up_notes: e.target.value }))} />
              </div>
            </div>
          </div>

          {editing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="is_completed" checked={form.is_completed} onChange={e => setForm(f => ({ ...f, is_completed: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <label htmlFor="is_completed" style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Mark as completed</label>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
