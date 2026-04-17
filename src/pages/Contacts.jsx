import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import * as XLSX from 'xlsx';

const DEPT_GROUPS = ['Executive', 'Procurement', 'Supply Chain', 'Operations', 'Drilling', 'Finance', 'Legal', 'Other'];

const DEPT_STYLE = {
  Executive:      { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  Procurement:    { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  'Supply Chain': { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  Operations:     { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Drilling:       { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  Finance:        { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8' },
  Legal:          { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  Other:          { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
};

const DEPT_ICONS = {
  Executive: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Procurement: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  'Supply Chain': <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>,
  Operations: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
  Drilling: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  Finance: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Legal: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Other: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

const TITLE_PRESETS = {
  Executive: ['CEO', 'CFO', 'COO', 'President', 'Vice President', 'VP Operations', 'VP Drilling', 'VP Supply Chain', 'VP Business Development', 'Director of Operations', 'Director'],
  Procurement: ['Procurement Manager', 'Purchasing Manager', 'Buyer', 'Category Manager', 'Contract Administrator', 'Procurement Specialist', 'Vendor Relations Manager'],
  'Supply Chain': ['Supply Chain Manager', 'Logistics Manager', 'Materials Manager', 'Inventory Manager', 'Supply Coordinator', 'Transportation Manager'],
  Operations: ['Company Man', 'Drilling Superintendent', 'Field Superintendent', 'Operations Manager', 'OIM', 'Tool Pusher', 'Driller', 'Site Manager'],
  Drilling: ['Drilling Engineer', 'Senior Drilling Engineer', 'Drilling Manager', 'Completions Engineer', 'Well Site Geologist', 'Drilling Supervisor'],
  Finance: ['Finance Manager', 'Controller', 'Accounts Payable', 'Cost Accountant', 'Financial Analyst'],
  Legal: ['Legal Counsel', 'Contract Manager', 'Landman', 'Compliance Manager'],
  Other: ['Administrative Assistant', 'Receptionist', 'HSE Manager', 'IT Manager', 'Other'],
};

const IMPORT_FIELDS = [
  { key: 'operator_name', label: 'Operator Name' },
  { key: 'name', label: 'Full Name' },
  { key: 'title', label: 'Title / Role' },
  { key: 'department', label: 'Department' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'mobile_phone', label: 'Mobile Phone' },
  { key: 'office_location', label: 'Office Location' },
  { key: 'notes', label: 'Notes' },
];

const emptyForm = { operator_id: '', name: '', title: '', department: '', role_type: '', influence_level: '', email: '', phone: '', mobile_phone: '', office_location: '', is_primary: false, notes: '' };

function deptStyle(dept) { return DEPT_STYLE[dept] || DEPT_STYLE.Other; }

function DeptBadge({ dept }) {
  if (!dept) return null;
  const s = deptStyle(dept);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {DEPT_ICONS[dept]}
      {dept}
    </span>
  );
}

function InitialsAvatar({ name, dept, size = 40 }) {
  const parts = (name || '').split(' ').filter(Boolean);
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0]?.[0] || '?');
  const s = deptStyle(dept);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: s.bg, border: `2px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.35, color: s.color, flexShrink: 0, userSelect: 'none' }}>
      {initials.toUpperCase()}
    </div>
  );
}

function ContactCard({ contact, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, transition: 'box-shadow 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <InitialsAvatar name={contact.name} dept={contact.department} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{contact.name}</span>
            {contact.is_primary && <span style={{ fontSize: 9, fontWeight: 800, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 99, padding: '1px 6px' }}>PRIMARY</span>}
          </div>
          {contact.title && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{contact.title}{contact.role_type ? ` · ${contact.role_type}` : ''}</div>}
          <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <DeptBadge dept={contact.department} />
            {contact.influence_level && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: contact.influence_level === 'Decision Maker' ? '#dbeafe' : contact.influence_level === 'Influencer' ? '#dcfce7' : contact.influence_level === 'Champion' ? '#fdf4ff' : '#fef9c3', color: contact.influence_level === 'Decision Maker' ? '#1e40af' : contact.influence_level === 'Influencer' ? '#15803d' : contact.influence_level === 'Champion' ? '#7e22ce' : '#854d0e', border: `1px solid ${contact.influence_level === 'Decision Maker' ? '#bfdbfe' : contact.influence_level === 'Influencer' ? '#86efac' : contact.influence_level === 'Champion' ? '#e9d5ff' : '#fde047'}` }}>
                {contact.influence_level}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEdit(contact)} title="Edit" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => onDelete(contact.id)} title="Delete" style={{ background: 'none', border: '1px solid #fee2e2', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4, borderTop: '1px solid var(--border-light)' }}>
        {contact.email && (
          <a href={`mailto:${contact.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.email}</span>
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            {contact.phone}
          </a>
        )}
        {contact.mobile_phone && (
          <a href={`tel:${contact.mobile_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            {contact.mobile_phone}
          </a>
        )}
        {contact.office_location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {contact.office_location}
          </div>
        )}
        {contact.notes && !expanded && (
          <button onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', textAlign: 'left', padding: 0 }}>Show notes…</button>
        )}
        {contact.notes && expanded && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 2, borderTop: '1px solid var(--border-light)', whiteSpace: 'pre-wrap' }}>{contact.notes}
            <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--primary)', padding: 0, marginLeft: 6 }}>less</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DropZone({ onFile }) {
  const [over, setOver] = useState(false);
  const ref = useRef();
  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      style={{ border: `2px dashed ${over ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 12, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: over ? 'var(--surface-2)' : 'white', transition: 'all 0.2s' }}
    >
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Drop your Excel or CSV file here</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports .xlsx, .xls, .csv — click to browse</div>
    </div>
  );
}

export default function Contacts() {
  const [allContacts, setAllContacts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selectedOp, setSelectedOp] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [opSearch, setOpSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importRows, setImportRows] = useState([]);
  const [importMapping, setImportMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [contacts, ops] = await Promise.all([api.contacts.list(), api.operators.list()]);
      setAllContacts(contacts);
      setOperators(ops);
    } finally { setLoading(false); }
  };

  const opCounts = useMemo(() => {
    const m = {};
    allContacts.forEach(c => { m[c.operator_id] = (m[c.operator_id] || 0) + 1; });
    return m;
  }, [allContacts]);

  const filtered = useMemo(() => {
    let list = allContacts;
    if (selectedOp !== 'all') list = list.filter(c => +c.operator_id === +selectedOp);
    if (deptFilter !== 'all') list = list.filter(c => (c.department || 'Other') === deptFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.operator_name?.toLowerCase().includes(q) || c.office_location?.toLowerCase().includes(q));
    }
    return list;
  }, [allContacts, selectedOp, deptFilter, search]);

  const groupedByDept = useMemo(() => {
    const groups = {};
    filtered.forEach(c => {
      const d = c.department || 'Other';
      if (!groups[d]) groups[d] = [];
      groups[d].push(c);
    });
    return groups;
  }, [filtered]);

  const orderedDepts = useMemo(() => DEPT_GROUPS.filter(d => groupedByDept[d]), [groupedByDept]);

  const filteredOps = useMemo(() => {
    if (!opSearch) return operators.filter(o => opCounts[o.id] > 0 || true);
    return operators.filter(o => o.name?.toLowerCase().includes(opSearch.toLowerCase()));
  }, [operators, opSearch]);

  const openAdd = (opId = null) => {
    setEditing(null);
    setForm({ ...emptyForm, operator_id: opId || (selectedOp !== 'all' ? selectedOp : '') });
    setShowModal(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setForm({ operator_id: contact.operator_id, name: contact.name, title: contact.title || '', department: contact.department || '', email: contact.email || '', phone: contact.phone || '', mobile_phone: contact.mobile_phone || '', office_location: contact.office_location || '', is_primary: contact.is_primary || false, notes: contact.notes || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.operator_id) return alert('Name and Operator are required.');
    setSaving(true);
    try {
      if (editing) {
        await api.contacts.update(editing.id, form);
      } else {
        await api.contacts.create(form);
      }
      setShowModal(false);
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await api.contacts.delete(id);
    setAllContacts(p => p.filter(c => c.id !== id));
  };

  const handleFile = async (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let rows = [];
      if (file.name.endsWith('.csv')) {
        const text = new TextDecoder().decode(e.target.result);
        rows = text.split('\n').map(l => l.split(',').map(v => v.replace(/^"|"$/g, '').trim()));
      } else {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      }
      const headers = (rows[0] || []).map(String);
      const dataRows = rows.slice(1).filter(r => r.some(v => v !== '' && v !== null && v !== undefined));
      setImportHeaders(headers);
      setImportRows(dataRows);
      const auto = {};
      IMPORT_FIELDS.forEach(f => {
        const match = headers.findIndex(h => h.toLowerCase().replace(/[^a-z]/g, '').includes(f.key.replace(/_/g, '').toLowerCase()) || f.label.toLowerCase().replace(/[^a-z]/g, '').includes(h.toLowerCase().replace(/[^a-z]/g, '')));
        if (match >= 0) auto[f.key] = match;
      });
      setImportMapping(auto);
      setImportStep(2);
    };
    reader.readAsArrayBuffer(file);
  };

  const importPreview = useMemo(() => {
    return importRows.slice(0, 5).map(row => {
      const obj = {};
      IMPORT_FIELDS.forEach(f => {
        if (importMapping[f.key] !== undefined && importMapping[f.key] !== '') {
          obj[f.key] = String(row[importMapping[f.key]] || '').trim();
        }
      });
      return obj;
    });
  }, [importRows, importMapping]);

  const handleImport = async () => {
    const contacts = importRows.map(row => {
      const obj = {};
      IMPORT_FIELDS.forEach(f => {
        if (importMapping[f.key] !== undefined && importMapping[f.key] !== '') {
          obj[f.key] = String(row[importMapping[f.key]] || '').trim();
        }
      });
      return obj;
    }).filter(c => c.name);
    setImporting(true);
    try {
      const result = await api.contacts.bulkImport(contacts);
      setImportResult(result);
      setImportStep(3);
      await load();
    } finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Operator Name', 'Full Name', 'Title / Role', 'Department', 'Email', 'Phone', 'Mobile Phone', 'Office Location', 'Notes'],
      ['EOG Resources', 'John Smith', 'Procurement Manager', 'Procurement', 'jsmith@eog.com', '713-555-0100', '713-555-0101', 'Houston, TX', ''],
      ['Pioneer Natural Resources', 'Jane Doe', 'Company Man', 'Operations', 'jdoe@pxd.com', '432-555-0200', '', 'Midland, TX', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, 'contacts_import_template.xlsx');
  };

  const closeImport = () => { setShowImport(false); setImportStep(1); setImportHeaders([]); setImportRows([]); setImportMapping({}); setImportResult(null); };

  const totalByDept = DEPT_GROUPS.reduce((m, d) => { m[d] = allContacts.filter(c => (c.department || 'Other') === d).length; return m; }, {});

  if (loading) return <div className="loading"><div className="spinner" />Loading contacts…</div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1>Contact Directory</h1><p>{allContacts.length} contacts across {operators.length} operators</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Template
          </button>
          <button className="btn btn-secondary" onClick={() => { setImportStep(1); setImportResult(null); setShowImport(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            Import Excel
          </button>
          <button className="btn btn-primary" onClick={() => openAdd()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Contact
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div className="stat-content"><div className="value">{allContacts.length}</div><div className="label">Total Contacts</div></div></div>
        <div className="stat-card"><div className="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div><div className="stat-content"><div className="value">{operators.filter(o => opCounts[o.id]).length}</div><div className="label">Operators w/ Contacts</div></div></div>
        <div className="stat-card"><div className="stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><div className="stat-content"><div className="value">{allContacts.filter(c => c.is_primary).length}</div><div className="label">Primary Contacts</div></div></div>
        <div className="stat-card"><div className="stat-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div><div className="stat-content"><div className="value">{totalByDept['Procurement'] + totalByDept['Supply Chain']}</div><div className="label">Procurement / SC</div></div></div>
        <div className="stat-card"><div className="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div><div className="stat-content"><div className="value">{totalByDept['Operations']}</div><div className="label">Field Operations</div></div></div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ width: 230, flexShrink: 0 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 20 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <input placeholder="Search operators…" value={opSearch} onChange={e => setOpSearch(e.target.value)} style={{ width: '100%', padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <button
                onClick={() => setSelectedOp('all')}
                style={{ width: '100%', padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: selectedOp === 'all' ? 'var(--primary)' : 'white', color: selectedOp === 'all' ? 'white' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}
              >
                <span style={{ fontWeight: 700, fontSize: 13 }}>All Operators</span>
                <span style={{ fontSize: 11, background: selectedOp === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--surface-2)', borderRadius: 99, padding: '1px 8px', fontWeight: 700 }}>{allContacts.length}</span>
              </button>
              {filteredOps.map(op => (
                <button
                  key={op.id}
                  onClick={() => setSelectedOp(String(op.id))}
                  style={{ width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: selectedOp === String(op.id) ? '#eff6ff' : 'white', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (selectedOp !== String(op.id)) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (selectedOp !== String(op.id)) e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: selectedOp === String(op.id) ? 'var(--primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.name}</div>
                    {op.basin && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{op.basin}</div>}
                  </div>
                  <span style={{ fontSize: 11, background: opCounts[op.id] > 0 ? '#eff6ff' : 'var(--surface-2)', color: opCounts[op.id] > 0 ? 'var(--primary)' : 'var(--text-muted)', borderRadius: 99, padding: '1px 8px', fontWeight: 700, flexShrink: 0 }}>{opCounts[op.id] || 0}</span>
                </button>
              ))}
            </div>
            {selectedOp !== 'all' && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => openAdd(selectedOp)}>
                  + Add Contact for {operators.find(o => String(o.id) === selectedOp)?.name?.split(' ')[0]}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search by name, title, email, location…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {['all', ...DEPT_GROUPS].map(d => (
                <button key={d} onClick={() => setDeptFilter(d)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: deptFilter === d ? 'white' : 'transparent', color: deptFilter === d ? (DEPT_STYLE[d]?.color || 'var(--primary)') : 'var(--text-muted)', boxShadow: deptFilter === d ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap' }}>
                  {d === 'all' ? `All (${allContacts.length})` : `${d} (${totalByDept[d]})`}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card"><div className="empty-state"><p>No contacts match your filters. Try selecting a different operator or clearing your search.</p><button className="btn btn-primary" onClick={() => openAdd()}>Add Your First Contact</button></div></div>
          ) : (
            <div>
              {orderedDepts.map(dept => (
                <div key={dept} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <DeptBadge dept={dept} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{groupedByDept[dept].length} contact{groupedByDept[dept].length !== 1 ? 's' : ''}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {groupedByDept[dept].map(c => (
                      <ContactCard key={c.id} contact={c} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Contact' : 'Add Contact'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update Contact' : 'Add Contact'}</button>
        </>}
      >
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Operator *</label>
            <select className="form-control" value={form.operator_id} onChange={e => setForm({ ...form, operator_id: e.target.value })} required>
              <option value="">Select Operator…</option>
              {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Full Name *</label>
            <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="First Last" required />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-control" value={form.department} onChange={e => setForm({ ...form, department: e.target.value, title: '' })}>
              <option value="">Select Department</option>
              {DEPT_GROUPS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Title / Role</label>
            {form.department && TITLE_PRESETS[form.department] ? (
              <select className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}>
                <option value="">Select Title</option>
                {TITLE_PRESETS[form.department].map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__custom">Custom…</option>
              </select>
            ) : (
              <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Company Man" />
            )}
          </div>
          {form.title === '__custom' && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Custom Title</label>
              <input className="form-control" onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter custom title" autoFocus />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Role Type</label>
            <select className="form-control" value={form.role_type} onChange={e => setForm({ ...form, role_type: e.target.value })}>
              <option value="">— Select —</option>
              {['Drilling','Completions','Production','Procurement','Supply Chain','Executive','Legal','Finance','Other'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Influence Level</label>
            <select className="form-control" value={form.influence_level} onChange={e => setForm({ ...form, influence_level: e.target.value })}>
              <option value="">— Select —</option>
              {['Decision Maker','Influencer','Gatekeeper','Champion','End User'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Email</label>
            <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-control" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" />
          </div>
          <div className="form-group">
            <label className="form-label">Mobile Phone</label>
            <input className="form-control" type="tel" value={form.mobile_phone} onChange={e => setForm({ ...form, mobile_phone: e.target.value })} placeholder="(555) 000-0000" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Office Location</label>
            <input className="form-control" value={form.office_location} onChange={e => setForm({ ...form, office_location: e.target.value })} placeholder="Houston, TX · Woodlands Office" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} />
              Mark as Primary Contact for this Operator
            </label>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any relevant notes about this contact…" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showImport} onClose={closeImport} title="Import Contacts from Excel" size="lg"
        footer={
          importStep === 1 ? null :
          importStep === 2 ? (
            <>
              <button className="btn btn-outline" onClick={() => setImportStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>{importing ? 'Importing…' : `Import ${importRows.length} Contacts`}</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={closeImport}>Done</button>
          )
        }
      >
        {importStep === 1 && (
          <div>
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af', border: '1px solid #bfdbfe' }}>
              <strong>Tip:</strong> Download the template to get the correct column format. Your spreadsheet needs at minimum: <strong>Operator Name</strong> and <strong>Full Name</strong> columns. Operator names must match exactly with your existing operators list.
            </div>
            <DropZone onFile={handleFile} />
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Excel Template
              </button>
            </div>
          </div>
        )}
        {importStep === 2 && (
          <div>
            <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#166534', border: '1px solid #bbf7d0' }}>
              Found <strong>{importRows.length} rows</strong> and <strong>{importHeaders.length} columns</strong>. Map the columns below, then click Import.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {IMPORT_FIELDS.map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</label>
                  <select value={importMapping[f.key] ?? ''} onChange={e => setImportMapping(m => ({ ...m, [f.key]: e.target.value === '' ? undefined : +e.target.value }))} style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12 }}>
                    <option value="">— skip —</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Preview (first 5 rows)</div>
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr style={{ background: 'var(--surface-2)' }}>{IMPORT_FIELDS.filter(f => importMapping[f.key] !== undefined).map(f => <th key={f.key} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{f.label}</th>)}</tr></thead>
                <tbody>{importPreview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    {IMPORT_FIELDS.filter(f => importMapping[f.key] !== undefined).map(f => <td key={f.key} style={{ padding: '5px 10px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[f.key] || '—'}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        {importStep === 3 && importResult && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#15803d', marginBottom: 4 }}>{importResult.imported} contacts imported</div>
            {importResult.skipped > 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{importResult.skipped} skipped (operator not found or missing name)</div>}
            {importResult.errors?.length > 0 && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, fontSize: 11, color: '#991b1b', textAlign: 'left', border: '1px solid #fecaca', maxHeight: 100, overflowY: 'auto' }}>
                {importResult.errors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
