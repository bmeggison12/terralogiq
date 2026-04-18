import * as XLSX from 'xlsx';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import ScoreDisplay from '../components/ScoreDisplay.jsx';
import * as XLSX from 'xlsx';

const BASINS = [
  'Permian Basin','Eagle Ford','Haynesville','Bakken','Marcellus','Utica',
  'DJ Basin','SCOOP-STACK','Woodford','Powder River Basin','Piceance Basin',
  'San Juan Basin','Barnett Shale','Fayetteville','Arkoma Basin','Appalachian',
  'Gulf of Mexico','Gulf Coast','Mid-Continent','Other'
];
const OPERATOR_TYPES = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'private_equity', label: 'PE-Backed' },
];
const MSA_STATUSES = ['Not Started','In Progress','In Review','Sent for Signature','Active','Expired','Terminated'];

const MSA_STYLE = {
  'Active':               { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  'In Progress':          { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'In Review':            { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'Sent for Signature':   { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  'Expired':              { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  'Terminated':           { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  'Not Started':          { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
};

function MSADropdown({ value, onSave, saving }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const style = MSA_STYLE[value] || MSA_STYLE['Not Started'];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => !saving && setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 9px 3px 9px', borderRadius: 100,
          background: style.bg, color: style.color,
          border: `1px solid ${style.border}`,
          fontSize: 11, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
          transition: 'opacity 0.1s', opacity: saving ? 0.6 : 1,
          whiteSpace: 'nowrap'
        }}
      >
        {saving ? (
          <span style={{ width: 8, height: 8, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
        ) : (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        )}
        {value || 'Not Started'}
        {!saving && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200,
          background: 'white', borderRadius: 8, border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, minWidth: 180,
          marginTop: 4
        }}>
          {MSA_STATUSES.map(s => {
            const st = MSA_STYLE[s] || MSA_STYLE['Not Started'];
            return (
              <button
                key={s}
                onClick={() => { onSave(s); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', border: 'none',
                  background: s === value ? 'var(--bg)' : 'transparent',
                  cursor: 'pointer', borderRadius: 5, textAlign: 'left',
                  fontSize: 12, fontWeight: s === value ? 700 : 500,
                  color: 'var(--text-primary)'
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: st.color, flexShrink: 0
                }} />
                {s}
                {s === value && <svg style={{ marginLeft: 'auto' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlineName({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef();

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = async () => {
    if (!draft.trim() || draft.trim() === value) { setEditing(false); setDraft(value); return; }
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          onBlur={commit}
          style={{
            border: '1.5px solid var(--primary-light)', borderRadius: 5,
            padding: '3px 7px', fontSize: 13, fontWeight: 600,
            outline: 'none', minWidth: 160, background: 'var(--surface)',
            color: 'var(--text-primary)'
          }}
        />
        {saving && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>saving…</span>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{value}</span>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        title="Edit name"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: '2px', borderRadius: 3,
          display: 'flex', alignItems: 'center', flexShrink: 0,
          opacity: 0, transition: 'opacity 0.1s'
        }}
        className="edit-name-btn"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  );
}

const COMPETITOR_CATEGORIES = [
  { key: 'Housing',           color: '#0ea5e9', icon: '🏠' },
  { key: 'Water/Sewer',       color: '#10b981', icon: '💧' },
  { key: 'Surface Rentals',   color: '#f59e0b', icon: '🏗️' },
  { key: 'Communications',    color: '#8b5cf6', icon: '📡' },
];

function CompetitorModal({ operator, onClose }) {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState({});
  const [noteInputs, setNoteInputs] = useState({});
  const [adding, setAdding] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.competitors.list(operator.id);
      setCompetitors(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [operator.id]);

  const handleAdd = async (category) => {
    const name = (inputs[category] || '').trim();
    if (!name) return;
    setAdding(a => ({ ...a, [category]: true }));
    try {
      await api.competitors.add(operator.id, { category, competitor_name: name, notes: noteInputs[category] || null });
      setInputs(i => ({ ...i, [category]: '' }));
      setNoteInputs(n => ({ ...n, [category]: '' }));
      await load();
    } finally { setAdding(a => ({ ...a, [category]: false })); }
  };

  const handleRemove = async (id) => {
    await api.competitors.remove(operator.id, id);
    setCompetitors(prev => prev.filter(c => c.id !== id));
  };

  const byCategory = (cat) => competitors.filter(c => c.category === cat);
  const totalCount = competitors.length;

  return (
    <div style={{ minWidth: 520 }}>
      {loading ? (
        <div className="loading"><div className="spinner"/>Loading...</div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Track which competitor companies are working with <strong>{operator.name}</strong> across each service category.
            {totalCount > 0 && <span style={{ marginLeft: 6, fontWeight: 600, color: 'var(--text-primary)' }}>{totalCount} competitor{totalCount !== 1 ? 's' : ''} listed.</span>}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {COMPETITOR_CATEGORIES.map(cat => {
              const list = byCategory(cat.key);
              return (
                <div key={cat.key} style={{ border: `1.5px solid ${cat.color}33`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ background: `${cat.color}18`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${cat.color}33` }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: cat.color }}>{cat.key}</span>
                    {list.length > 0 && (
                      <span style={{ marginLeft: 'auto', background: cat.color, color: 'white', borderRadius: 100, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{list.length}</span>
                    )}
                  </div>
                  <div style={{ padding: 12 }}>
                    {list.length > 0 ? (
                      <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {list.map(c => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border-light)' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.competitor_name}</div>
                              {c.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{c.notes}</div>}
                            </div>
                            <button
                              onClick={() => handleRemove(c.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                              title="Remove"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>No competitors listed yet</div>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        className="form-control"
                        placeholder={`Add ${cat.key} competitor...`}
                        value={inputs[cat.key] || ''}
                        onChange={e => setInputs(i => ({ ...i, [cat.key]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(cat.key); }}
                        style={{ flex: 1, fontSize: 12 }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAdd(cat.key)}
                        disabled={adding[cat.key] || !inputs[cat.key]?.trim()}
                        style={{ flexShrink: 0, background: cat.color, borderColor: cat.color }}
                      >
                        {adding[cat.key] ? '...' : '+ Add'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <button className="btn btn-outline" onClick={onClose}>Done</button>
          </div>
        </>
      )}
    </div>
  );
}

function CompetitorsDetailCard({ operatorId }) {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!operatorId) return;
    setLoading(true);
    api.competitors.list(operatorId).then(setCompetitors).finally(() => setLoading(false));
  }, [operatorId]);

  const byCategory = (cat) => competitors.filter(c => c.category === cat);
  const hasSome = COMPETITOR_CATEGORIES.some(cat => byCategory(cat.key).length > 0);

  if (loading) return null;

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Competitors ({competitors.length})</span></div>
      {!hasSome ? (
        <div className="empty-state"><p>No competitors listed. Use the Operators list to add competitors per category.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }}>
          {COMPETITOR_CATEGORIES.map((cat, idx) => {
            const list = byCategory(cat.key);
            return (
              <div key={cat.key} style={{ padding: 16, borderBottom: idx < 2 ? '1px solid var(--border-light)' : 'none', borderRight: idx % 2 === 0 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>{cat.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.key}</span>
                  {list.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({list.length})</span>}
                </div>
                {list.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {list.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{c.competitor_name}</span>
                        {c.notes && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— {c.notes}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const emptyForm = { name: '', basin: '', state: '', relationship_score: 5, next_action: '', next_action_date: '', revenue_per_rig: '', notes: '', last_contact_date: '', territory_id: '', operator_type: 'public', parent_company: '', hq_city: '', hq_state: '' };

export default function Operators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [basinFilter, setBasinFilter] = useState('');
  const [msaFilter, setMsaFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [territories, setTerritories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingMsa, setSavingMsa] = useState({});
  const [savedMsa, setSavedMsa] = useState({});
  const [selectedOp, setSelectedOp] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', title: '', role_type: '', influence_level: '', email: '', phone: '', is_primary: false, notes: '' });
  const [activeTab, setActiveTab] = useState('list');
  const [competitorOp, setCompetitorOp] = useState(null);

  // 🔥 EXCEL UPLOAD HANDLER (SAFE)
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (evt) => {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    console.log("EXCEL DATA:", json);
  };

  reader.readAsArrayBuffer(file);
};
  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (basinFilter) params.basin = basinFilter;
      const [data, terr] = await Promise.all([api.operators.list(params), api.territories.list()]);
      setOperators(data);
      setTerritories(terr);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, basinFilter]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (op) => {
    setEditing(op);
    setForm({ ...op, revenue_per_rig: op.revenue_per_rig || '', next_action_date: op.next_action_date ? op.next_action_date.split('T')[0] : '', last_contact_date: op.last_contact_date ? op.last_contact_date.split('T')[0] : '', territory_id: op.territory_id || '', operator_type: op.operator_type || 'public', parent_company: op.parent_company || '', hq_city: op.hq_city || '', hq_state: op.hq_state || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.operators.update(editing.id, form);
      else await api.operators.create(form);
      setShowModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this operator?')) return;
    await api.operators.delete(id);
    load();
  };

  const handleInlineName = async (op, newName) => {
    await api.operators.update(op.id, { ...op, name: newName });
    setOperators(prev => prev.map(o => o.id === op.id ? { ...o, name: newName } : o));
  };

  const handleInlineMSA = async (op, newStatus) => {
    setSavingMsa(prev => ({ ...prev, [op.id]: true }));
    try {
      await api.msa.save({ operator_id: op.id, status: newStatus });
      setOperators(prev => prev.map(o => o.id === op.id ? { ...o, msa_status: newStatus } : o));
      setSavedMsa(prev => ({ ...prev, [op.id]: true }));
      setTimeout(() => setSavedMsa(prev => ({ ...prev, [op.id]: false })), 1500);
    } finally {
      setSavingMsa(prev => ({ ...prev, [op.id]: false }));
    }
  };

  const openOperator = async (op) => {
    setSelectedOp(op);
    setActiveTab('details');
    const ctcts = await api.contacts.list({ operator_id: op.id });
    setContacts(ctcts);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.contacts.create({ ...contactForm, operator_id: selectedOp.id });
      setShowContactModal(false);
      const ctcts = await api.contacts.list({ operator_id: selectedOp.id });
      setContacts(ctcts);
      setContactForm({ name: '', title: '', role_type: '', influence_level: '', email: '', phone: '', is_primary: false, notes: '' });
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await api.contacts.delete(id);
    const ctcts = await api.contacts.list({ operator_id: selectedOp.id });
    setContacts(ctcts);
  };

  const filtered = operators.filter(o => {
    if (msaFilter && (o.msa_status || 'Not Started') !== msaFilter) return false;
    if (typeFilter && (o.operator_type || 'public') !== typeFilter) return false;
    return true;
  });

  return (
    <div className="page-content">
      <style>{`
        tr:hover .edit-name-btn { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {activeTab === 'list' ? (
        <>
          <div className="page-header">
            <div>
              <h1>Operators</h1>
              <p>Click any operator name or MSA badge to edit inline</p>
            </div>
            <button className="btn btn-primary" onClick={openCreate}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Operator
            </button>
          </div>

          <div className="filters-bar">
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search operators..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 150 }} value={basinFilter} onChange={e => setBasinFilter(e.target.value)}>
              <option value="">All Basins</option>
              {BASINS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="form-control" style={{ width: 140 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {OPERATOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select className="form-control" style={{ width: 160 }} value={msaFilter} onChange={e => setMsaFilter(e.target.value)}>
              <option value="">All MSA Statuses</option>
              {MSA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(search || basinFilter || msaFilter || typeFilter) && (
              <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setBasinFilter(''); setMsaFilter(''); setTypeFilter(''); }}>
                Clear filters
              </button>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} operators</span>
            <input
  type="file"
  accept=".xlsx,.csv"
  onChange={handleFileUpload}
  style={{ fontSize: 12 }}
/>
          </div>

          <div className="card">
            <div className="table-wrapper">
              {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Operator Name</th>
                      <th>Basin</th>
                      <th>MSA Status</th>
                      <th>Rigs</th>
                      <th>Relationship</th>
                      <th>Last Contact</th>
                      <th>Next Action</th>
                      <th>Rev Potential</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(op => (
                      <tr key={op.id}>
                        <td>
                          <InlineName
                            value={op.name}
                            onSave={(newName) => handleInlineName(op, newName)}
                          />
                          <div style={{ display: 'flex', gap: 4, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => openOperator(op)}
                              style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--primary)', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                            >
                              View details →
                            </button>
                            {op.operator_type && op.operator_type !== 'public' && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                                background: op.operator_type === 'private_equity' ? '#fef3c7' : '#f1f5f9',
                                color: op.operator_type === 'private_equity' ? '#92400e' : '#475569',
                                border: `1px solid ${op.operator_type === 'private_equity' ? '#fde68a' : '#e2e8f0'}`,
                              }}>
                                {op.operator_type === 'private_equity' ? 'PE' : 'PVT'}
                              </span>
                            )}
                            {op.hq_city && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{op.hq_city}{op.hq_state ? `, ${op.hq_state}` : ''}</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {op.territory_name && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: (op.territory_color || '#1e3a5f') + '20', border: `1px solid ${(op.territory_color || '#1e3a5f')}40`, borderRadius: 10, fontSize: 10, fontWeight: 600, color: op.territory_color || '#1e3a5f', whiteSpace: 'nowrap' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: op.territory_color || '#1e3a5f', flexShrink: 0 }} />
                                {op.territory_name}
                              </span>
                            )}
                            {op.basin
                              ? <span className="badge badge-blue" style={{ fontSize: 10 }}>{op.basin}</span>
                              : !op.territory_name && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                            }
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MSADropdown
                              value={op.msa_status || 'Not Started'}
                              onSave={(s) => handleInlineMSA(op, s)}
                              saving={!!savingMsa[op.id]}
                            />
                            {savedMsa[op.id] && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: 16, textAlign: 'center' }}>{op.active_rig_count || 0}</td>
                        <td><ScoreDisplay score={op.relationship_score || 5} /></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {op.last_contact_date ? new Date(op.last_contact_date).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ maxWidth: 160, fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {op.next_action || '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                          {op.total_revenue_potential && parseFloat(op.total_revenue_potential) > 0
                            ? '$' + parseFloat(op.total_revenue_potential).toLocaleString()
                            : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setCompetitorOp(op)} title="View/edit competitors" style={{ color: '#8b5cf6' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              Comp.
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(op)}>Edit</button>
                            <button className="btn btn-outline btn-sm" onClick={() => handleDelete(op.id)} style={{ color: 'var(--danger)' }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={9}>
                          <div className="empty-state"><p>No operators found</p></div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="page-header">
            <div>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('list')} style={{ marginBottom: 8 }}>← Back to Operators</button>
              <h1>{selectedOp?.name}</h1>
              <p>{selectedOp?.basin} · {selectedOp?.state}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => openEdit(selectedOp)}>Edit Operator</button>
              <button className="btn btn-primary" onClick={() => setShowContactModal(true)}>Add Contact</button>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Operator Details</span></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Basin', value: selectedOp?.basin },
                    { label: 'State', value: selectedOp?.state },
                    { label: 'Active Rigs', value: selectedOp?.active_rig_count },
                    { label: 'Revenue/Rig', value: selectedOp?.revenue_per_rig ? '$' + parseFloat(selectedOp.revenue_per_rig).toLocaleString() : '—' },
                    { label: 'Type', value: selectedOp?.operator_type === 'private_equity' ? 'PE-Backed' : selectedOp?.operator_type === 'private' ? 'Private' : 'Public' },
                    { label: 'Parent Company', value: selectedOp?.parent_company },
                    { label: 'Headquarters', value: [selectedOp?.hq_city, selectedOp?.hq_state].filter(Boolean).join(', ') || null },
                    { label: 'Last Contact', value: selectedOp?.last_contact_date ? new Date(selectedOp.last_contact_date).toLocaleDateString() : '—' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontWeight: 600 }}>{item.value || '—'}</div>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>MSA Status</div>
                    <MSADropdown
                      value={selectedOp?.msa_status || 'Not Started'}
                      onSave={async (s) => {
                        await handleInlineMSA(selectedOp, s);
                        setSelectedOp(prev => ({ ...prev, msa_status: s }));
                      }}
                      saving={!!savingMsa[selectedOp?.id]}
                    />
                  </div>
                </div>
                {selectedOp?.relationship_score && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Relationship Score</div>
                    <ScoreDisplay score={selectedOp.relationship_score} />
                  </div>
                )}
                {selectedOp?.next_action && (
                  <div style={{ marginTop: 16, background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Next Action</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedOp.next_action}</div>
                    {selectedOp?.next_action_date && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>Due: {new Date(selectedOp.next_action_date).toLocaleDateString()}</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">Contacts ({contacts.length})</span>
              </div>
              {contacts.length === 0 ? <div className="empty-state"><p>No contacts yet</p></div> : (
                contacts.map(c => (
                  <div key={c.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {c.name}
                        {c.is_primary && <span className="badge badge-orange" style={{ fontSize: 10 }}>Primary</span>}
                        {c.influence_level && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: c.influence_level === 'Decision Maker' ? '#dbeafe' : c.influence_level === 'Influencer' ? '#dcfce7' : '#fef9c3', color: c.influence_level === 'Decision Maker' ? '#1e40af' : c.influence_level === 'Influencer' ? '#15803d' : '#854d0e', border: `1px solid ${c.influence_level === 'Decision Maker' ? '#bfdbfe' : c.influence_level === 'Influencer' ? '#86efac' : '#fde047'}` }}>{c.influence_level}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.title}{c.role_type ? ` · ${c.role_type}` : ''}</div>
                      {c.email && <div style={{ fontSize: 12, color: 'var(--primary)' }}>{c.email}</div>}
                      {c.phone && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.phone}</div>}
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDeleteContact(c.id)} style={{ color: 'var(--danger)' }}>Remove</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <CompetitorsDetailCard operatorId={selectedOp?.id} />

          {selectedOp?.notes && (
            <div className="card">
              <div className="card-header"><span className="card-title">Notes</span></div>
              <div className="card-body"><p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{selectedOp.notes}</p></div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Operator' : 'Add Operator'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Operator Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Territory</label>
              <select className="form-control" value={form.territory_id || ''} onChange={e => setForm({...form, territory_id: e.target.value || null})}>
                <option value="">— No territory assigned —</option>
                {territories.map(t => <option key={t.id} value={t.id}>{t.name}{t.states ? ` (${t.states})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Basin</label>
              <select className="form-control" value={form.basin || ''} onChange={e => setForm({...form, basin: e.target.value})}>
                <option value="">Select Basin</option>
                {BASINS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Operator Type</label>
              <select className="form-control" value={form.operator_type || 'public'} onChange={e => setForm({...form, operator_type: e.target.value})}>
                {OPERATOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-control" value={form.state || ''} onChange={e => setForm({...form, state: e.target.value})} placeholder="TX, CO, ND..." />
            </div>
            <div className="form-group">
              <label className="form-label">Parent Company</label>
              <input className="form-control" value={form.parent_company || ''} onChange={e => setForm({...form, parent_company: e.target.value})} placeholder="e.g. Chevron Corporation" />
            </div>
            <div className="form-group">
              <label className="form-label">HQ City</label>
              <input className="form-control" value={form.hq_city || ''} onChange={e => setForm({...form, hq_city: e.target.value})} placeholder="Houston" />
            </div>
            <div className="form-group">
              <label className="form-label">HQ State</label>
              <input className="form-control" value={form.hq_state || ''} onChange={e => setForm({...form, hq_state: e.target.value})} placeholder="TX" />
            </div>
            <div className="form-group">
              <label className="form-label">Relationship Score (1-10)</label>
              <input className="form-control" type="number" min="1" max="10" value={form.relationship_score || 5} onChange={e => setForm({...form, relationship_score: parseInt(e.target.value)})} />
            </div>
            <div className="form-group">
              <label className="form-label">Revenue Per Rig ($)</label>
              <input className="form-control" type="number" value={form.revenue_per_rig || ''} onChange={e => setForm({...form, revenue_per_rig: e.target.value})} placeholder="75000" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Contact Date</label>
              <input className="form-control" type="date" value={form.last_contact_date || ''} onChange={e => setForm({...form, last_contact_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Next Action Date</label>
              <input className="form-control" type="date" value={form.next_action_date || ''} onChange={e => setForm({...form, next_action_date: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Next Action</label>
              <input className="form-control" value={form.next_action || ''} onChange={e => setForm({...form, next_action: e.target.value})} placeholder="What needs to happen next?" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-control" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!competitorOp} onClose={() => setCompetitorOp(null)} title={`Competitors — ${competitorOp?.name || ''}`}>
        {competitorOp && <CompetitorModal operator={competitorOp} onClose={() => setCompetitorOp(null)} />}
      </Modal>

      <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="Add Contact"
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowContactModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddContact} disabled={saving}>{saving ? 'Saving...' : 'Add Contact'}</button>
        </>}>
        <form onSubmit={handleAddContact}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Name *</label>
              <input className="form-control" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-control" value={contactForm.title || ''} onChange={e => setContactForm({...contactForm, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Role Type</label>
              <select className="form-control" value={contactForm.role_type || ''} onChange={e => setContactForm({...contactForm, role_type: e.target.value})}>
                <option value="">— Select —</option>
                {['Drilling','Completions','Production','Procurement','Supply Chain','Executive','Legal','Finance','Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Influence Level</label>
              <select className="form-control" value={contactForm.influence_level || ''} onChange={e => setContactForm({...contactForm, influence_level: e.target.value})}>
                <option value="">— Select —</option>
                {['Decision Maker','Influencer','Gatekeeper','Champion','End User'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={contactForm.email || ''} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={contactForm.phone || ''} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="isPrimary" checked={contactForm.is_primary} onChange={e => setContactForm({...contactForm, is_primary: e.target.checked})} />
              <label htmlFor="isPrimary" style={{ fontSize: 13, cursor: 'pointer' }}>Primary Contact</label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
