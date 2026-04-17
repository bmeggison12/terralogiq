import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';

const fmt = (n) => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n) => n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'K' : fmt(n);

const EOG_CATALOG = [
  { category: 'Combo Package', description: 'Full Package Daily Fee (5 TH + 12 Satellite + 1 RO + 1 WT + 2 FT + 1 TFR + 10 Sewer Pumps)', unitPrice: 1050, uom: 'per day', isMob: false },
  { category: 'Trailer Houses', description: 'Company Man Trailer House', unitPrice: 35, uom: 'per day', isMob: false },
  { category: 'Trailer Houses', description: 'Supporting Trailer House', unitPrice: 35, uom: 'per day', isMob: false },
  { category: 'Trailer Houses', description: 'Delivery / Pick Up / Move (Trailers)', unitPrice: 1200, uom: 'each', isMob: true },
  { category: 'Trailer Houses', description: 'Texas Permit', unitPrice: 90, uom: 'each', isMob: true },
  { category: 'Skid Houses', description: 'Company Man Complex (double skid)', unitPrice: 75, uom: 'per day', isMob: false },
  { category: 'Skid Houses', description: 'Premium Living Quarters (DE)', unitPrice: 75, uom: 'per day', isMob: false },
  { category: 'Skid Houses', description: 'CM SH (1 Office, 2 Bedrooms)', unitPrice: 65, uom: 'per day', isMob: false },
  { category: 'Skid Houses', description: 'Command Center', unitPrice: 65, uom: 'per day', isMob: false },
  { category: 'Skid Houses', description: 'Set Up Fee (per unit)', unitPrice: 450, uom: 'each', isMob: true },
  { category: 'Skid Houses', description: 'Peak Winch Truck / Extendable Trailer', unitPrice: 195, uom: 'hourly', isMob: true },
  { category: 'Water Tank', description: '3000 Gallon Water Tank', unitPrice: 10, uom: 'per day', isMob: false },
  { category: 'Water Tank', description: 'Water Tank PU / Del / Move', unitPrice: 300, uom: 'each', isMob: true },
  { category: 'Sewer Tank', description: '3000 Gallon Sewer Holding Tank', unitPrice: 10, uom: 'per day', isMob: false },
  { category: 'Sewer Tank', description: 'Sewer Tank PU / Del / Move', unitPrice: 300, uom: 'each', isMob: true },
  { category: 'Sewer Tank', description: 'Sumps (crew side only)', unitPrice: 10, uom: 'per day', isMob: false },
  { category: 'RO / Aerobic System', description: 'Water / Septic Combo (per day)', unitPrice: 700, uom: 'per day', isMob: false },
  { category: 'RO / Aerobic System', description: 'Initial Delivery & Set Up', unitPrice: 1500, uom: 'each', isMob: true },
  { category: 'RO / Aerobic System', description: 'Rig Up / Rig Down (In Field Move)', unitPrice: 1000, uom: 'each', isMob: true },
  { category: 'Frac Tanks', description: 'Frac Tank MOB', unitPrice: 800, uom: 'each', isMob: true },
  { category: 'Generators', description: '45 KVA Generator', unitPrice: 75, uom: 'per day', isMob: false },
  { category: 'Generators', description: '75 KVA Generator', unitPrice: 100, uom: 'per day', isMob: false },
  { category: 'Generators', description: '120 / 125 KVA Generator', unitPrice: 150, uom: 'per day', isMob: false },
  { category: 'Generators', description: 'Generator PU / Del / Move', unitPrice: 300, uom: 'each', isMob: true },
  { category: 'Generators', description: 'Transformer', unitPrice: 65, uom: 'per day', isMob: false },
  { category: 'Generators', description: 'Transformer PU / Del / Move', unitPrice: 300, uom: 'each', isMob: true },
  { category: 'Light Plants', description: '6K Light Plant', unitPrice: 50, uom: 'per day', isMob: false },
  { category: 'Light Plants', description: 'Light Plant PU / Del / Move', unitPrice: 200, uom: 'each', isMob: true },
  { category: 'Portable Toilets', description: 'Toilet Porta John', unitPrice: 8, uom: 'per day', isMob: false },
  { category: 'Portable Toilets', description: 'Porta John PU / Del / Move (each way)', unitPrice: 45, uom: 'each', isMob: true },
  { category: 'Portable Toilets', description: 'Toilet Cleaning and Chemical', unitPrice: 45, uom: 'per pot', isMob: false },
  { category: 'Portable Toilets', description: 'Service Charge (per trip)', unitPrice: 285, uom: 'per trip', isMob: false },
  { category: 'Trash Trailer', description: 'Trash Trailer', unitPrice: 15, uom: 'per day', isMob: false },
  { category: 'Trash Trailer', description: 'Trash Trailer PU / Del / Move', unitPrice: 300, uom: 'each', isMob: true },
  { category: 'Trash Trailer', description: 'Dump Fee', unitPrice: 250, uom: 'each', isMob: false },
  { category: 'Change Trailer', description: 'Change Trailer', unitPrice: 40, uom: 'per day', isMob: false },
  { category: 'Change Trailer', description: 'Change Trailer PU / Del / Move (each way)', unitPrice: 400, uom: 'each', isMob: true },
  { category: 'Change Trailer', description: 'Cleaning Fee Upon Release', unitPrice: 300, uom: 'each', isMob: true },
  { category: 'Communications', description: 'High Speed Internet (LTE / HughesNet)', unitPrice: 80, uom: 'per day', isMob: false },
  { category: 'Communications', description: 'Starlink', unitPrice: 85, uom: 'per day', isMob: false },
  { category: 'Communications', description: 'Engenius Phones (8 intercom)', unitPrice: 45, uom: 'per day', isMob: false },
  { category: 'Communications', description: 'Additional Access Point', unitPrice: 10, uom: 'per day', isMob: false },
  { category: 'Communications', description: 'Cell Phone Booster', unitPrice: 10, uom: 'per day', isMob: false },
  { category: 'Communications', description: '2 Camera Package', unitPrice: 30, uom: 'per day', isMob: false },
  { category: 'Communications', description: 'Internet PU / Del / Move', unitPrice: 325, uom: 'each', isMob: true },
  { category: 'Communications', description: 'Satellite Receiver HD (DirectTV)', unitPrice: 5, uom: 'per day', isMob: false },
];

const EOG_DEFAULT_ITEMS = [
  { id: 1, category: 'Combo Package', description: 'Full Package Daily Fee (5 TH + 12 Satellite + 1 RO + 1 WT + 2 FT + 1 TFR + 10 Sewer Pumps)', qty: 1, unitPrice: 1050, uom: 'per day', isMob: false },
  { id: 2, category: 'Trailer Houses', description: 'Delivery / Pick Up / Move (Trailers)', qty: 5, unitPrice: 1200, uom: 'each', isMob: true },
  { id: 3, category: 'Trailer Houses', description: 'Texas Permit', qty: 5, unitPrice: 90, uom: 'each', isMob: true },
  { id: 4, category: 'Water Tank', description: 'Water Tank PU / Del / Move', qty: 1, unitPrice: 300, uom: 'each', isMob: true },
  { id: 5, category: 'Frac Tanks', description: 'Frac Tank MOB', qty: 2, unitPrice: 800, uom: 'each', isMob: true },
  { id: 6, category: 'Generators', description: 'Transformer PU / Del / Move', qty: 1, unitPrice: 300, uom: 'each', isMob: true },
  { id: 7, category: 'RO / Aerobic System', description: 'Initial Delivery & Set Up', qty: 1, unitPrice: 1500, uom: 'each', isMob: true },
];

const CATEGORIES = [...new Set(EOG_CATALOG.map(i => i.category))];
const MOB_COLOR = '#8b5cf6';
const DAILY_COLOR = '#0ea5e9';
const REV_COLOR = '#10b981';

let nextId = 100;

function calcPackage(items, daysPerMonth) {
  const daily = items.filter(i => !i.isMob).reduce((s, i) => s + (+i.qty || 0) * (+i.unitPrice || 0), 0);
  const mob = items.filter(i => i.isMob).reduce((s, i) => s + (+i.qty || 0) * (+i.unitPrice || 0), 0);
  const monthly = daily * (daysPerMonth || 30);
  return { daily, mob, monthly, firstMonth: monthly + mob, annual: monthly * 12 };
}

function ItemRow({ item, onChange, onRemove }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: item.isMob ? MOB_COLOR : 'var(--text-primary)' }}>
          {item.description}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{item.category}</div>
      </td>
      <td style={{ padding: '8px 8px', width: 80 }}>
        <input
          type="number"
          min="0"
          step="0.5"
          value={item.qty}
          onChange={e => onChange({ ...item, qty: e.target.value })}
          style={{ width: 64, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center' }}
        />
      </td>
      <td style={{ padding: '8px 8px', width: 110 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={e => onChange({ ...item, unitPrice: e.target.value })}
            style={{ width: 80, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
          />
        </div>
      </td>
      <td style={{ padding: '8px 8px', width: 90, textAlign: 'center' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: item.isMob ? '#f5f3ff' : '#eff6ff',
          color: item.isMob ? MOB_COLOR : DAILY_COLOR,
          border: `1px solid ${item.isMob ? '#ddd6fe' : '#bfdbfe'}`,
        }}>{item.isMob ? 'MOB' : 'Daily'}</span>
      </td>
      <td style={{ padding: '8px 8px', width: 100, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
        {fmt((+item.qty || 0) * (+item.unitPrice || 0))}
      </td>
      <td style={{ padding: '8px 8px', width: 36 }}>
        <button onClick={() => onRemove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
      </td>
    </tr>
  );
}

function AddItemModal({ onAdd, onClose }) {
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const filtered = EOG_CATALOG.filter(i =>
    (!catFilter || i.category === catFilter) &&
    (!search || i.description.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Add Item — EOG Price Sheet</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <input
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
            autoFocus
          />
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map((item, i) => (
            <div key={i}
              onClick={() => { onAdd({ ...item, id: ++nextId, qty: 1 }); }}
              style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.category}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>${item.unitPrice.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.uom}</div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, flexShrink: 0,
                background: item.isMob ? '#f5f3ff' : '#eff6ff',
                color: item.isMob ? MOB_COLOR : DAILY_COLOR,
                border: `1px solid ${item.isMob ? '#ddd6fe' : '#bfdbfe'}`,
              }}>{item.isMob ? 'MOB' : 'Daily'}</span>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No items match your search</div>}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ calc, daysPerMonth, packageName, operatorName }) {
  const margin = 0.35;
  return (
    <div style={{ position: 'sticky', top: 20 }}>
      <div className="card" style={{ borderTop: `4px solid ${REV_COLOR}`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Revenue Summary</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#1e3a5f' }}>{packageName || 'New Package'}</div>
          {operatorName && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{operatorName}</div>}
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Daily Rate</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: DAILY_COLOR }}>{fmt(calc.daily)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Days / Month</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{daysPerMonth} days</span>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-light)' }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Monthly Revenue</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: REV_COLOR }}>{fmt(calc.monthly)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(calc.daily)} × {daysPerMonth} days</div>
          </div>

          <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #ddd6fe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: MOB_COLOR }}>MOB Fee (one-time)</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: MOB_COLOR }}>{fmt(calc.mob)}</span>
            </div>
            <div style={{ fontSize: 10, color: '#7c3aed' }}>Charged at mobilization</div>
          </div>

          <div style={{ background: '#1e3a5f', borderRadius: 10, padding: '14px 16px', color: 'white' }}>
            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>FIRST MONTH TOTAL</div>
            <div style={{ fontWeight: 900, fontSize: 26, lineHeight: 1 }}>{fmt(calc.firstMonth)}</div>
            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>Monthly {fmt(calc.monthly)} + MOB {fmt(calc.mob)}</div>
          </div>

          <div style={{ height: 1, background: 'var(--border-light)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Annual Revenue</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(calc.annual)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Est. Margin (~35%)</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#10b981' }}>{fmt(calc.monthly * margin)}/mo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>Breakdown</div>
        {[
          { label: 'Daily Items', value: calc.daily, color: DAILY_COLOR },
          { label: 'MOB Fees', value: calc.mob, color: MOB_COLOR },
        ].map(b => {
          const total = calc.daily + calc.mob;
          const pct = total > 0 ? Math.round((b.value / total) * 100) : 0;
          return (
            <div key={b.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: b.color }}>{b.label}</span>
                <span style={{ fontSize: 12 }}>{fmt(b.value)} ({pct}%)</span>
              </div>
              <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: b.color, borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RevenueCalculator() {
  const [packages, setPackages] = useState([]);
  const [operators, setOperators] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [packageName, setPackageName] = useState('EOG Drilling — Full Package');
  const [operatorId, setOperatorId] = useState('');
  const [daysPerMonth, setDaysPerMonth] = useState(30);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState(EOG_DEFAULT_ITEMS);
  const [showAddItem, setShowAddItem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [catFilter, setCatFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.revenuePackages.list(), api.operators.list()])
      .then(([pkgs, ops]) => { setPackages(pkgs); setOperators(ops); })
      .finally(() => setLoading(false));
  }, []);

  const calc = useMemo(() => calcPackage(items, daysPerMonth), [items, daysPerMonth]);

  const loadPackage = (pkg) => {
    setActiveId(pkg.id);
    setPackageName(pkg.package_name);
    setOperatorId(pkg.operator_id || '');
    setDaysPerMonth(pkg.days_per_month || 30);
    setNotes(pkg.notes || '');
    const loaded = (pkg.items || []).map((it, i) => ({ ...it, id: ++nextId }));
    setItems(loaded);
    setDirty(false);
  };

  const newPackage = () => {
    setActiveId(null);
    setPackageName('New Package');
    setOperatorId('');
    setDaysPerMonth(30);
    setNotes('');
    setItems([]);
    setDirty(false);
  };

  const loadEogTemplate = () => {
    setActiveId(null);
    setPackageName('EOG Drilling — Full Package');
    setOperatorId(operators.find(o => o.name?.toLowerCase().includes('eog'))?.id || '');
    setDaysPerMonth(30);
    setNotes('Full package: 5 THs, 12 satellite, 1 RO unit, 1 water tank, 2 frac tanks, 1 transformer, 10 sewer pumps. Per EOG price sheet dated June 1, 2024.');
    setItems(EOG_DEFAULT_ITEMS.map(it => ({ ...it, id: ++nextId })));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { package_name: packageName, operator_id: operatorId || null, days_per_month: daysPerMonth, notes, items };
      let saved;
      if (activeId) {
        saved = await api.revenuePackages.update(activeId, payload);
      } else {
        saved = await api.revenuePackages.create(payload);
        setActiveId(saved.id);
      }
      const updated = await api.revenuePackages.list();
      setPackages(updated);
      setDirty(false);
    } finally { setSaving(false); }
  };

  const deletePackage = async (id) => {
    if (!confirm('Delete this package?')) return;
    await api.revenuePackages.delete(id);
    setPackages(p => p.filter(x => x.id !== id));
    if (activeId === id) newPackage();
  };

  const updateItem = (updated) => { setItems(p => p.map(i => i.id === updated.id ? updated : i)); setDirty(true); };
  const removeItem = (id) => { setItems(p => p.filter(i => i.id !== id)); setDirty(true); };
  const addItem = (item) => { setItems(p => [...p, item]); setDirty(true); setShowAddItem(false); };

  const displayedItems = catFilter === 'all' ? items : catFilter === 'daily' ? items.filter(i => !i.isMob) : items.filter(i => i.isMob);
  const activeCategories = [...new Set(items.map(i => i.category))];
  const operatorName = operators.find(o => +o.id === +operatorId)?.name;

  const printPackage = () => {
    const win = window.open('', '_blank');
    const dailyRows = items.filter(i => !i.isMob).map(i => `
      <tr><td>${i.description}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">$${(+i.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td style="text-align:right;font-weight:600">$${((+i.qty)*(+i.unitPrice)).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');
    const mobRows = items.filter(i => i.isMob).map(i => `
      <tr><td>${i.description}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">$${(+i.unitPrice).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td style="text-align:right;font-weight:600">$${((+i.qty)*(+i.unitPrice)).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');
    win.document.write(`<html><head><title>${packageName} — Revenue Estimate</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#1e3a5f;color:white;padding:7px 10px;font-size:12px;text-align:left}td{padding:6px 10px;font-size:12px;border-bottom:1px solid #e5e7eb}.summary{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:8px}</style>
      </head><body>
      <h2 style="color:#1e3a5f;margin-bottom:2px">${packageName}</h2>
      <p style="color:#6b7280;font-size:12px;margin-bottom:20px">${operatorName ? 'Operator: ' + operatorName + ' &nbsp;·&nbsp; ' : ''}${daysPerMonth} days/month &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString()}</p>
      ${notes ? `<p style="font-size:12px;color:#374151;margin-bottom:16px;padding:10px;background:#f9fafb;border-left:3px solid #1e3a5f">${notes}</p>` : ''}
      <h3 style="color:#0ea5e9;margin-bottom:6px">Daily Items</h3>
      <table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${dailyRows}</tbody></table>
      <h3 style="color:#8b5cf6;margin-bottom:6px">MOB Fees (one-time)</h3>
      <table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${mobRows}</tbody></table>
      <div class="summary">
        <table style="margin:0"><tbody>
          <tr><td>Daily Rate</td><td style="text-align:right;font-weight:700">$${calc.daily.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
          <tr><td>Monthly Revenue (${daysPerMonth} days)</td><td style="text-align:right;font-weight:700;color:#10b981">$${calc.monthly.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
          <tr><td>MOB Fee (one-time)</td><td style="text-align:right;font-weight:700;color:#8b5cf6">$${calc.mob.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
          <tr style="border-top:2px solid #1e3a5f"><td style="font-weight:800;font-size:14px">First Month Total</td><td style="text-align:right;font-weight:900;font-size:18px;color:#1e3a5f">$${calc.firstMonth.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
          <tr><td>Annual Revenue (ongoing)</td><td style="text-align:right;font-weight:700">$${calc.annual.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
        </tbody></table>
      </div>
      ${notes ? '' : ''}</body></html>`);
    win.document.close(); win.print();
  };

  if (loading) return <div className="loading"><div className="spinner"/>Loading…</div>;

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {showAddItem && <AddItemModal onAdd={addItem} onClose={() => setShowAddItem(false)} />}

      <div style={{ width: 240, flexShrink: 0 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>Saved Packages</span>
            <button className="btn btn-primary btn-sm" onClick={newPackage} style={{ fontSize: 11, padding: '4px 10px' }}>+ New</button>
          </div>

          <button
            onClick={loadEogTemplate}
            style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', background: '#eff6ff', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>EOG Template</span>
          </button>

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {packages.length === 0 && (
              <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No saved packages yet</div>
            )}
            {packages.map(pkg => {
              const pkgCalc = calcPackage(pkg.items || [], pkg.days_per_month || 30);
              return (
                <div key={pkg.id}
                  onClick={() => loadPackage(pkg)}
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', background: activeId === pkg.id ? 'var(--surface-2)' : '', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (activeId !== pkg.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (activeId !== pkg.id) e.currentTarget.style.background = ''; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, wordBreak: 'break-word' }}>{pkg.package_name}</div>
                      {pkg.operator_name && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{pkg.operator_name}</div>}
                      <div style={{ fontSize: 11, fontWeight: 700, color: REV_COLOR, marginTop: 3 }}>{fmtK(pkgCalc.monthly)}/mo</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deletePackage(pkg.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: 0, flexShrink: 0 }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                value={packageName}
                onChange={e => { setPackageName(e.target.value); setDirty(true); }}
                style={{ fontWeight: 700, fontSize: 16, border: 'none', outline: 'none', width: '100%', background: 'transparent', color: 'var(--text-primary)' }}
                placeholder="Package Name"
              />
            </div>
            <select
              value={operatorId}
              onChange={e => { setOperatorId(e.target.value); setDirty(true); }}
              style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            >
              <option value="">No operator linked</option>
              {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Days/mo:</label>
              <input
                type="number"
                min="1"
                max="31"
                value={daysPerMonth}
                onChange={e => { setDaysPerMonth(+e.target.value || 30); setDirty(true); }}
                style={{ width: 56, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, textAlign: 'center' }}
              />
            </div>
            <button onClick={printPackage} className="btn btn-secondary btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
            <button onClick={save} disabled={saving} className="btn btn-primary btn-sm" style={{ opacity: dirty ? 1 : 0.6 }}>
              {saving ? 'Saving…' : activeId ? 'Update' : 'Save Package'}
            </button>
          </div>
          {notes !== undefined && (
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <input
                value={notes}
                onChange={e => { setNotes(e.target.value); setDirty(true); }}
                placeholder="Package notes (optional)…"
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-secondary)', background: 'transparent' }}
              />
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
              {[['all','All'], ['daily','Daily Only'], ['mob','MOB Only']].map(([v, l]) => (
                <button key={v} onClick={() => setCatFilter(v)} style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: catFilter === v ? 'white' : 'transparent',
                  color: catFilter === v ? (v === 'mob' ? MOB_COLOR : v === 'daily' ? DAILY_COLOR : 'var(--primary)') : 'var(--text-muted)',
                  boxShadow: catFilter === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}>{l}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} items</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddItem(true)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Item
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">
              <p>No items yet. Click "Add Item" to build your package from the EOG price sheet, or load the EOG template from the left panel.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                    <th style={{ width: 110 }}>Unit Price</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Type</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Line Total</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {activeCategories
                    .filter(cat => catFilter === 'all' ||
                      (catFilter === 'daily' && displayedItems.some(i => i.category === cat && !i.isMob)) ||
                      (catFilter === 'mob' && displayedItems.some(i => i.category === cat && i.isMob)))
                    .map(cat => {
                      const catItems = displayedItems.filter(i => i.category === cat);
                      if (!catItems.length) return null;
                      const catTotal = catItems.reduce((s, i) => s + (+i.qty || 0) * (+i.unitPrice || 0), 0);
                      return (
                        <React.Fragment key={cat}>
                          <tr>
                            <td colSpan={6} style={{ padding: '8px 12px 4px', background: 'var(--surface-2)', borderTop: '2px solid var(--border-light)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(catTotal)}</span>
                              </div>
                            </td>
                          </tr>
                          {catItems.map(item => (
                            <ItemRow key={item.id} item={item} onChange={updateItem} onRemove={removeItem} />
                          ))}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Daily Rate</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: DAILY_COLOR }}>{fmt(calc.daily)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>MOB Fee</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: MOB_COLOR }}>{fmt(calc.mob)}</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Monthly ({daysPerMonth} days)</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: REV_COLOR }}>{fmt(calc.monthly)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>First Month</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: '#1e3a5f' }}>{fmt(calc.firstMonth)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: 260, flexShrink: 0 }}>
        <SummaryCard calc={calc} daysPerMonth={daysPerMonth} packageName={packageName} operatorName={operatorName} />
      </div>
    </div>
  );
}
