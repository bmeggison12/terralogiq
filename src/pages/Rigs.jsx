import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const PROB_BANDS = [
  { label: 'High (75–100%)',   min: 75,  max: 100, color: '#10b981' },
  { label: 'Good (50–74%)',    min: 50,  max: 74,  color: '#3b82f6' },
  { label: 'Fair (25–49%)',    min: 25,  max: 49,  color: '#f59e0b' },
  { label: 'Low (0–24%)',      min: 0,   max: 24,  color: '#ef4444' },
  { label: 'Not Rated',        min: null, max: null, color: '#9ca3af' },
];

const OP_COLORS = ['#1e3a5f','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444','#64748b'];

const CUSTOM_TOOLTIP = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: d.payload.color }}>{d.name}</div>
      <div>{d.value} rig{d.value !== 1 ? 's' : ''} <span style={{ color: '#6b7280' }}>({((d.value / d.payload.total) * 100).toFixed(0)}%)</span></div>
    </div>
  );
};

function RigPerformanceCharts({ filtered }) {
  const probData = useMemo(() => {
    const counts = PROB_BANDS.map(b => {
      const count = filtered.filter(r => {
        const p = r.win_probability;
        if (b.min === null) return p === null || p === undefined;
        return p !== null && p !== undefined && p >= b.min && p <= b.max;
      }).length;
      return { name: b.label, value: count, color: b.color, total: filtered.length };
    }).filter(d => d.value > 0);
    return counts;
  }, [filtered]);

  const opData = useMemo(() => {
    const counts = {};
    filtered.forEach(r => { counts[r.operator_name] = (counts[r.operator_name] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6);
    const other = sorted.slice(6).reduce((s, [, v]) => s + v, 0);
    const result = top.map(([name, value], i) => ({ name, value, color: OP_COLORS[i], total: filtered.length }));
    if (other > 0) result.push({ name: 'Other', value: other, color: '#94a3b8', total: filtered.length });
    return result;
  }, [filtered]);

  const peakData = useMemo(() => {
    const peak = filtered.filter(r => r.is_peak_rig).length;
    const prospect = filtered.length - peak;
    return [
      { name: 'Peak Rigs', value: peak, color: '#ea580c', total: filtered.length },
      { name: 'Prospects', value: prospect, color: '#cbd5e1', total: filtered.length },
    ].filter(d => d.value > 0);
  }, [filtered]);

  const weightedAvg = useMemo(() => {
    const rated = filtered.filter(r => r.win_probability !== null && r.win_probability !== undefined);
    if (!rated.length) return null;
    return Math.round(rated.reduce((s, r) => s + r.win_probability, 0) / rated.length);
  }, [filtered]);

  const ratedCount = filtered.filter(r => r.win_probability !== null && r.win_probability !== undefined).length;

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, total }) => {
    if (value / total < 0.07) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{Math.round((value / total) * 100)}%</text>;
  };

  return (
    <div style={{ padding: '0 0 16px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '0 20px' }}>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '14px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Win Probability</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ratedCount} of {filtered.length} rigs rated</div>
            </div>
            {weightedAvg !== null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: weightedAvg >= 75 ? '#10b981' : weightedAvg >= 50 ? '#3b82f6' : weightedAvg >= 25 ? '#f59e0b' : '#ef4444' }}>{weightedAvg}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>avg</div>
              </div>
            )}
          </div>
          {probData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 12 }}>No probability data yet.<br/>Click "Set %" on any rig to start.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={probData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false} label={renderLabel}>
                  {probData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '14px 12px' }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>By Operator</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} rigs across {opData.length} operator{opData.length !== 1 ? 's' : ''}</div>
          </div>
          {opData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 12 }}>No rigs match current filter.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={opData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false} label={renderLabel}>
                  {opData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} formatter={v => v.length > 18 ? v.slice(0, 16) + '…' : v} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '14px 12px' }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Peak vs Prospects</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Service capture rate</div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 12 }}>No rigs match current filter.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={peakData} cx="50%" cy="50%" innerRadius={36} outerRadius={60} dataKey="value" labelLine={false} label={renderLabel}>
                    {peakData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
                {peakData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 99, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'white', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Capture Rate</div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${filtered.length > 0 ? (peakData.find(d => d.name === 'Peak Rigs')?.value || 0) / filtered.length * 100 : 0}%`, height: '100%', background: '#ea580c', borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ea580c', marginTop: 3 }}>
                  {filtered.length > 0 ? Math.round((peakData.find(d => d.name === 'Peak Rigs')?.value || 0) / filtered.length * 100) : 0}% of selected rigs are Peak
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

const PEAK_EQUIPMENT = [
  'Office / Command Trailer',
  'Man Camp / Sleeper Trailer',
  'Light Tower',
  'Diesel Generator',
  'Fuel Storage Tank',
  'Frac Tank (Open-Top)',
  'Water Tank (Closed-Top)',
  'Chemical Storage Tank',
  'Vacuum Trailer',
  'Skid Mounted Pump',
  'Tool House / Storage Connex',
  'Portable Restroom / Toilet',
  'Dumpster / Waste Container',
  'Safety Equipment Package',
  'Picker / Crane Truck',
  'Pressure Washer Unit',
];

function EquipmentModal({ rig, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ item_name: '', quantity: 1, unit: '', notes: '' });
  const [customItem, setCustomItem] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.rigs.getEquipment(rig.id);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [rig.id]);

  const addItem = async (itemName) => {
    setSaving(true);
    try {
      await api.rigs.addEquipment(rig.id, { item_name: itemName, quantity: 1 });
      load();
    } finally { setSaving(false); }
  };

  const handleCustomAdd = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    setSaving(true);
    try {
      await api.rigs.addEquipment(rig.id, form);
      setForm({ item_name: '', quantity: 1, unit: '', notes: '' });
      setAdding(false);
      load();
    } finally { setSaving(false); }
  };

  const removeItem = async (id) => {
    await api.rigs.deleteEquipment(id);
    load();
  };

  const checkedNames = new Set(items.map(i => i.item_name));

  return (
    <div style={{ minWidth: 500 }}>
      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Rig</div>
        <div style={{ fontWeight: 700 }}>{rig.rig_name} — {rig.operator_name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rig.contractor} · {rig.county}, {rig.state}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Standard Equipment Checklist</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {PEAK_EQUIPMENT.map(item => {
            const checked = checkedNames.has(item);
            return (
              <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, border: `1px solid ${checked ? 'var(--primary-light)' : 'var(--border)'}`, background: checked ? 'var(--primary-bg)' : 'transparent', cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      const it = items.find(i => i.item_name === item);
                      if (it) removeItem(it.id);
                    } else {
                      addItem(item);
                    }
                  }}
                  disabled={saving}
                />
                <span style={{ fontWeight: checked ? 600 : 400, color: checked ? 'var(--primary)' : 'var(--text-primary)' }}>{item}</span>
              </label>
            );
          })}
        </div>
      </div>

      {items.filter(i => !PEAK_EQUIPMENT.includes(i.item_name)).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Custom Items</div>
          {items.filter(i => !PEAK_EQUIPMENT.includes(i.item_name)).map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 4, fontSize: 12 }}>
              <span>{item.item_name} {item.quantity > 1 ? `(×${item.quantity})` : ''} {item.notes ? `— ${item.notes}` : ''}</span>
              <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <form onSubmit={handleCustomAdd} style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Add Custom Item</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
            <input className="form-control" placeholder="Item name" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} required style={{ fontSize: 12 }} />
            <input className="form-control" type="number" min="1" placeholder="Qty" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) })} style={{ fontSize: 12 }} />
          </div>
          <input className="form-control" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ fontSize: 12, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>Add</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-outline btn-sm" onClick={() => setAdding(true)} style={{ fontSize: 12 }}>
          + Add Custom Item
        </button>
      )}

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} item{items.length !== 1 ? 's' : ''} on site</span>
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function PriceSheetModal({ operator, onClose, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    setUploading(true);
    try {
      await api.operators.uploadPriceSheet(operator.id, file);
      onUploaded();
      onClose();
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ minWidth: 400 }}>
      <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
        Upload a price sheet for <strong>{operator.name}</strong>. PDF, Excel, or image files accepted.
      </p>
      {operator.price_sheet_name && (
        <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current file</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{operator.price_sheet_name}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={operator.price_sheet_data} download={operator.price_sheet_name} className="btn btn-outline btn-sm">Download</a>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={async () => {
              await api.operators.deletePriceSheet(operator.id);
              onUploaded();
              onClose();
            }}>Remove</button>
          </div>
        </div>
      )}
      <div
        className="file-upload-zone"
        style={{ padding: 24 }}
        onClick={() => fileRef.current.click()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{uploading ? 'Uploading...' : 'Click to upload price sheet'}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, Excel, PNG, JPG</p>
        <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
      </div>
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button className="btn btn-outline" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const KENEDY_TX = { lat: 28.8220, lon: -97.8536, name: 'Kenedy, TX (Yard)' };

const DISTANCE_ZONES = [
  { label: '< 50 mi',     max: 50,  color: '#22c55e', fill: '#22c55e', ring: '#15803d' },
  { label: '50–100 mi',  max: 100, color: '#eab308', fill: '#eab308', ring: '#a16207' },
  { label: '100–150 mi', max: 150, color: '#f97316', fill: '#f97316', ring: '#c2410c' },
  { label: '> 150 mi',   max: Infinity, color: '#ef4444', fill: '#ef4444', ring: '#b91c1c' },
];

function getZone(distMi) {
  return DISTANCE_ZONES.find(z => distMi < z.max) || DISTANCE_ZONES[DISTANCE_ZONES.length - 1];
}

// Fix Leaflet default icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const yardIcon = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#1e3a5f;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  </div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitBounds({ rigs }) {
  const map = useMap();
  useEffect(() => {
    if (rigs.length === 0) return;
    const bounds = rigs
      .filter(r => r.latitude && r.longitude)
      .map(r => [parseFloat(r.latitude), parseFloat(r.longitude)]);
    bounds.push([KENEDY_TX.lat, KENEDY_TX.lon]);
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
  }, [rigs.length]);
  return null;
}

function RigMap({ rigs }) {
  const [peakOnly, setPeakOnly] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  const rigsWithDist = useMemo(() => rigs
    .filter(r => r.latitude && r.longitude)
    .map(r => {
      const distMi = haversine(KENEDY_TX.lat, KENEDY_TX.lon, parseFloat(r.latitude), parseFloat(r.longitude));
      return { ...r, distMi, zone: getZone(distMi) };
    })
    .sort((a, b) => a.distMi - b.distMi),
  [rigs]);

  const source = peakOnly ? rigsWithDist.filter(r => r.is_peak_rig) : rigsWithDist;
  const filtered = selectedZone ? source.filter(r => r.zone.label === selectedZone) : source;

  const zoneCounts = DISTANCE_ZONES.map(z => ({
    ...z,
    count: source.filter(r => r.zone.label === z.label).length,
  }));

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {zoneCounts.map(z => (
              <button
                key={z.label}
                onClick={() => setSelectedZone(selectedZone === z.label ? null : z.label)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '6px 14px', borderRadius: 100,
                  border: `2px solid ${z.color}`,
                  background: selectedZone === z.label ? z.color : 'transparent',
                  color: selectedZone === z.label ? 'white' : z.color,
                  fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: selectedZone === z.label ? 'white' : z.color, flexShrink: 0 }} />
                {z.label}
                <span style={{ fontWeight: 400, opacity: 0.85 }}>({z.count})</span>
              </button>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginLeft: 8 }}>
              <input type="checkbox" checked={peakOnly} onChange={e => setPeakOnly(e.target.checked)} />
              Peak rigs only
            </label>
            {(selectedZone || peakOnly) && (
              <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => { setSelectedZone(null); setPeakOnly(false); }}>Clear</button>
            )}
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <MapContainer
              center={[KENEDY_TX.lat, KENEDY_TX.lon]}
              zoom={8}
              style={{ height: 560, width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <FitBounds rigs={filtered} />

              <Marker position={[KENEDY_TX.lat, KENEDY_TX.lon]} icon={yardIcon}>
                <Popup>
                  <div style={{ fontFamily: 'sans-serif', minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', marginBottom: 2 }}>📍 {KENEDY_TX.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Home Yard</div>
                  </div>
                </Popup>
              </Marker>

              {filtered.map((rig, i) => (
                <CircleMarker
                  key={`${rig.id}-${i}`}
                  center={[parseFloat(rig.latitude), parseFloat(rig.longitude)]}
                  radius={rig.is_peak_rig ? 9 : 7}
                  pathOptions={{
                    fillColor: rig.zone.fill,
                    fillOpacity: 0.85,
                    color: rig.is_peak_rig ? '#1e3a5f' : rig.zone.ring,
                    weight: rig.is_peak_rig ? 2.5 : 1.5,
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'sans-serif', minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: rig.zone.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{rig.rig_name}</span>
                        {rig.is_peak_rig && <span style={{ fontSize: 10, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 100, padding: '1px 6px', fontWeight: 700 }}>⭐ Peak</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}><strong>Operator:</strong> {rig.operator_name}</div>
                      <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}><strong>Contractor:</strong> {rig.contractor || '—'}</div>
                      <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}><strong>County:</strong> {rig.county ? rig.county.charAt(0) + rig.county.slice(1).toLowerCase() : '—'}, {rig.state || ''}</div>
                      {rig.formation && <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}><strong>Formation:</strong> {rig.formation}</div>}
                      {rig.drill_type && <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}><strong>Drill Type:</strong> {rig.drill_type}</div>}
                      <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}><strong>Coords:</strong> {parseFloat(rig.latitude).toFixed(4)}°N, {Math.abs(parseFloat(rig.longitude)).toFixed(4)}°W</div>
                      {(rig.company_man_day || rig.company_man_night) && (
                        <div style={{ margin: '6px 0', padding: '5px 8px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a' }}>
                          {rig.company_man_day && <div style={{ fontSize: 11, color: '#92400e' }}>☀️ <strong>Day:</strong> {rig.company_man_day}</div>}
                          {rig.company_man_night && <div style={{ fontSize: 11, color: '#1e40af', marginTop: 2 }}>🌙 <strong>Night:</strong> {rig.company_man_night}</div>}
                        </div>
                      )}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, background: rig.zone.color + '22', border: `1px solid ${rig.zone.color}`, fontSize: 12, fontWeight: 700, color: rig.zone.ring }}>
                        {rig.distMi.toFixed(1)} mi from yard
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1e3a5f', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Kenedy Yard</span>
            </div>
            {DISTANCE_ZONES.map(z => (
              <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: z.color, flexShrink: 0, border: `1.5px solid ${z.ring}` }} />
                <span style={{ fontSize: 12 }}>{z.label}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 8, paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#6b7280', border: '2.5px solid #1e3a5f', flexShrink: 0 }} />
                <span style={{ fontSize: 12 }}>Thick border = Peak rig</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closest Rigs</div>
            {source.slice(0, 8).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, paddingBottom: 7, borderBottom: i < 7 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.zone.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rig_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.operator_name}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: r.zone.ring, flexShrink: 0 }}>{Math.round(r.distMi)} mi</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {zoneCounts.map(z => (
          <div key={z.label} className="card" style={{ padding: '14px 18px', borderTop: `3px solid ${z.color}` }}>
            <div style={{ fontWeight: 800, fontSize: 28, color: z.color }}>{z.count}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{z.label} from Kenedy</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{source.length > 0 ? Math.round(z.count / source.length * 100) : 0}% of rigs</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BOERNE_TX = { lat: 29.7947, lon: -98.7320, name: 'Boerne, TX' };
const CLUSTER_RADIUS_DEG = 0.04; // ~2.7 miles — rigs within this range grouped as one stop

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clusterRigs(rigs) {
  const activeRigs = rigs.filter(r => r.latitude && r.longitude && r.status === 'active');
  const stops = [];
  const used = new Set();

  for (let i = 0; i < activeRigs.length; i++) {
    if (used.has(i)) continue;
    const rig = activeRigs[i];
    const cluster = [rig];
    used.add(i);
    for (let j = i + 1; j < activeRigs.length; j++) {
      if (used.has(j)) continue;
      const other = activeRigs[j];
      const dLat = Math.abs(parseFloat(other.latitude) - parseFloat(rig.latitude));
      const dLon = Math.abs(parseFloat(other.longitude) - parseFloat(rig.longitude));
      if (dLat < CLUSTER_RADIUS_DEG && dLon < CLUSTER_RADIUS_DEG) {
        cluster.push(other);
        used.add(j);
      }
    }
    const lat = cluster.reduce((s, r) => s + parseFloat(r.latitude), 0) / cluster.length;
    const lon = cluster.reduce((s, r) => s + parseFloat(r.longitude), 0) / cluster.length;
    const operators = [...new Set(cluster.map(r => r.operator_name).filter(Boolean))];
    const county = cluster[0].county;
    stops.push({ lat, lon, rigs: cluster, operators, county, id: `stop-${i}` });
  }
  return stops;
}

function nearestNeighborRoute(stops, start) {
  const remaining = [...stops];
  const route = [];
  let cur = start;
  let totalMiles = 0;

  while (remaining.length > 0) {
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(cur.lat, cur.lon, remaining[i].lat, remaining[i].lon);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const stop = remaining.splice(bestIdx, 1)[0];
    const driveMi = bestDist * 1.28;
    const driveMin = Math.round((driveMi / 60) * 60);
    totalMiles += driveMi;
    route.push({ ...stop, distFromPrev: driveMi, driveMin, cumMiles: totalMiles });
    cur = stop;
  }

  const returnDist = haversine(cur.lat, cur.lon, start.lat, start.lon) * 1.28;
  totalMiles += returnDist;
  return { route, totalMiles, returnDist };
}

const DAY_COLORS = [
  { label: 'Monday',    short: 'MON', bg: '#3b82f6', dark: '#1d4ed8', light: '#eff6ff' },
  { label: 'Tuesday',   short: 'TUE', bg: '#8b5cf6', dark: '#6d28d9', light: '#f5f3ff' },
  { label: 'Wednesday', short: 'WED', bg: '#10b981', dark: '#065f46', light: '#ecfdf5' },
  { label: 'Thursday',  short: 'THU', bg: '#f97316', dark: '#c2410c', light: '#fff7ed' },
];

function kmeans4(stops, maxIter = 60) {
  if (stops.length === 0) return [];
  if (stops.length <= 4) return stops.map((_, i) => i);
  const lats = stops.map(s => s.lat), lons = stops.map(s => s.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const midLat = (minLat + maxLat) / 2, midLon = (minLon + maxLon) / 2;
  let centroids = [
    { lat: midLat + (maxLat-midLat)*0.5, lon: midLon - (midLon-minLon)*0.5 },
    { lat: midLat + (maxLat-midLat)*0.5, lon: midLon + (maxLon-midLon)*0.5 },
    { lat: midLat - (midLat-minLat)*0.5, lon: midLon - (midLon-minLon)*0.5 },
    { lat: midLat - (midLat-minLat)*0.5, lon: midLon + (maxLon-midLon)*0.5 },
  ];
  let assignments = new Array(stops.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const next = stops.map(s => {
      let minD = Infinity, idx = 0;
      centroids.forEach((c, ci) => { const d = haversine(s.lat, s.lon, c.lat, c.lon); if (d < minD) { minD = d; idx = ci; } });
      return idx;
    });
    if (next.every((a, i) => a === assignments[i])) break;
    assignments = next;
    centroids = centroids.map((_, ci) => {
      const pts = stops.filter((_, i) => assignments[i] === ci);
      if (!pts.length) return centroids[ci];
      return { lat: pts.reduce((s,p)=>s+p.lat,0)/pts.length, lon: pts.reduce((s,p)=>s+p.lon,0)/pts.length };
    });
  }
  return assignments;
}

function buildFourDayPlan(stops) {
  const assignments = kmeans4(stops);
  const clusters = [0,1,2,3].map(ci => stops.filter((_,i) => assignments[i] === ci));
  const withDist = clusters.map(cl => {
    if (!cl.length) return { stops: cl, distFromHome: Infinity };
    const avgLat = cl.reduce((s,p)=>s+p.lat,0)/cl.length;
    const avgLon = cl.reduce((s,p)=>s+p.lon,0)/cl.length;
    return { stops: cl, distFromHome: haversine(BOERNE_TX.lat, BOERNE_TX.lon, avgLat, avgLon) };
  });
  withDist.sort((a,b) => a.distFromHome - b.distFromHome);
  return withDist.map((cl, dayIdx) => {
    const { route, totalMiles, returnDist } = nearestNeighborRoute(cl.stops, BOERNE_TX);
    return { day: DAY_COLORS[dayIdx], route, totalMiles, returnDist, driveHrs: totalMiles / 55 };
  });
}

function FourDayRouteMap({ plan }) {
  const map = useMap();
  useEffect(() => {
    const allPts = plan.flatMap(d => d.route.map(s => [s.lat, s.lon]));
    allPts.push([BOERNE_TX.lat, BOERNE_TX.lon]);
    if (allPts.length > 1) map.fitBounds(allPts, { padding: [30,30] });
  }, [plan.length]);
  return null;
}

function RoutePlanner({ rigs }) {
  const [peakOnly, setPeakOnly] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [expandedDay, setExpandedDay] = useState(0);

  const sourceRigs = peakOnly ? rigs.filter(r => r.is_peak_rig) : rigs;
  const stops = useMemo(() => clusterRigs(sourceRigs), [sourceRigs.length, peakOnly]);
  const plan = useMemo(() => buildFourDayPlan(stops), [stops.length]);

  const totalMiles = plan.reduce((s,d) => s + d.totalMiles, 0);
  const totalStops = plan.reduce((s,d) => s + d.route.length, 0);
  const totalHrs = totalMiles / 55;

  const printAllDays = () => {
    const win = window.open('', '_blank');
    const dayBlocks = plan.map(d => {
      const rows = d.route.map((s,i) => `
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:6px 10px;font-weight:700;color:${d.day.bg}">${i+1}</td>
          <td style="padding:6px 10px"><div style="font-weight:600;font-size:12px">${s.operators.join(', ')}</div><div style="font-size:10px;color:#6b7280">${s.rigs.map(r=>r.rig_name).join(', ')}</div></td>
          <td style="padding:6px 10px;font-size:11px;color:#6b7280">${s.county ? s.county.replace(/\b\w/g,l=>l.toUpperCase()) : '—'}</td>
          <td style="padding:6px 10px;font-size:11px;text-align:right">${s.distFromPrev.toFixed(1)} mi</td>
          <td style="padding:6px 10px;font-size:11px;text-align:right">${s.driveMin} min</td>
          <td style="padding:6px 10px;font-size:11px;font-weight:600;text-align:right">${s.cumMiles.toFixed(1)} mi</td>
        </tr>`).join('');
      return `<div style="margin-bottom:28px;page-break-inside:avoid">
        <h3 style="margin:0 0 4px;color:${d.day.bg};border-left:4px solid ${d.day.bg};padding-left:10px">${d.day.label} — ${d.route.length} stops · ~${Math.round(d.totalMiles)} mi · ~${Math.floor(d.driveHrs)}h${Math.round((d.driveHrs%1)*60)}m</h3>
        <table style="width:100%;border-collapse:collapse;margin-top:6px">
          <thead><tr style="background:${d.day.bg};color:white"><th style="padding:6px 10px;text-align:left;font-size:11px">#</th><th style="padding:6px 10px;text-align:left;font-size:11px">Operator / Rig</th><th style="padding:6px 10px;text-align:left;font-size:11px">County</th><th style="padding:6px 10px;text-align:right;font-size:11px">Drive</th><th style="padding:6px 10px;text-align:right;font-size:11px">Time</th><th style="padding:6px 10px;text-align:right;font-size:11px">Cum.</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:10px;color:#6b7280;margin:4px 0 0">Return to Boerne: ~${d.returnDist.toFixed(1)} mi</p>
      </div>`;
    }).join('');
    win.document.write(`<html><head><title>4-Day Rig Route</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}@media print{body{padding:12px}}</style></head><body>
      <h2 style="color:#1e3a5f;margin-bottom:2px">4-Day Weekly Rig Route</h2>
      <p style="color:#6b7280;margin-bottom:20px;font-size:12px">Starting point: Boerne, TX · ${totalStops} total stops · ~${Math.round(totalMiles)} total miles · Generated ${new Date().toLocaleDateString()}</p>
      ${dayBlocks}</body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Home Base</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>📍 Boerne, TX</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Start/end each day</div>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Stops</div>
          <div style={{ fontWeight: 800, fontSize: 26, color: 'var(--primary)' }}>{totalStops}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{Math.round(totalStops/4)}/day avg</div>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Weekly Miles</div>
          <div style={{ fontWeight: 800, fontSize: 26, color: '#0ea5e9' }}>{Math.round(totalMiles)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>~{Math.round(totalMiles/4)}/day</div>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Weekly Drive</div>
          <div style={{ fontWeight: 800, fontSize: 26, color: '#10b981' }}>{Math.floor(totalHrs)}h {Math.round((totalHrs%1)*60)}m</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>at 55 mph avg</div>
        </div>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={peakOnly} onChange={e => setPeakOnly(e.target.checked)} />
            Peak rigs only
          </label>
          <button className="btn btn-primary btn-sm" onClick={printAllDays} style={{ fontSize: 11 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print 4-Day Plan
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {plan.map((d, di) => (
          <button key={di}
            onClick={() => setActiveDay(activeDay === di ? null : di)}
            style={{
              flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              border: `2px solid ${activeDay === di || activeDay === null ? d.day.bg : 'var(--border)'}`,
              background: activeDay === di ? d.day.bg : activeDay === null ? d.day.light : 'var(--surface)',
              color: activeDay === di ? 'white' : 'var(--text-primary)', transition: 'all 0.15s'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: activeDay === di ? 'white' : d.day.bg, marginBottom: 4 }}>{d.day.label.toUpperCase()}</div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{d.route.length} stops</div>
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.85 }}>~{Math.round(d.totalMiles)} mi · {Math.floor(d.driveHrs)}h{Math.round((d.driveHrs%1)*60)}m</div>
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <MapContainer center={[BOERNE_TX.lat, BOERNE_TX.lon]} zoom={7} style={{ height: 480, width: '100%' }} scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <FourDayRouteMap plan={plan} />
          <Marker position={[BOERNE_TX.lat, BOERNE_TX.lon]} icon={yardIcon}>
            <Popup><div style={{ fontFamily: 'sans-serif' }}><strong>📍 Boerne, TX</strong><br/><span style={{ fontSize: 11 }}>Home Base — Start/End each day</span></div></Popup>
          </Marker>
          {plan.map((d, di) => {
            if (activeDay !== null && activeDay !== di) return null;
            const routeCoords = [
              [BOERNE_TX.lat, BOERNE_TX.lon],
              ...d.route.map(s => [s.lat, s.lon]),
              [BOERNE_TX.lat, BOERNE_TX.lon],
            ];
            return (
              <React.Fragment key={di}>
                <Polyline positions={routeCoords} pathOptions={{ color: d.day.bg, weight: activeDay === di ? 3.5 : 2.5, opacity: activeDay !== null ? 0.9 : 0.65, dashArray: activeDay === null ? '6 4' : null }} />
                {d.route.map((stop, si) => (
                  <CircleMarker key={`${di}-${si}`}
                    center={[stop.lat, stop.lon]}
                    radius={stop.rigs.some(r=>r.is_peak_rig) ? 9 : 7}
                    pathOptions={{ fillColor: d.day.bg, fillOpacity: 0.9, color: stop.rigs.some(r=>r.is_peak_rig) ? '#1e3a5f' : d.day.dark, weight: stop.rigs.some(r=>r.is_peak_rig) ? 2.5 : 1.5 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'sans-serif', minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.day.bg, flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{d.day.label} — Stop {si+1}</span>
                        </div>
                        <div style={{ fontSize: 12, marginBottom: 2 }}><strong>Operator:</strong> {stop.operators.join(', ')}</div>
                        <div style={{ fontSize: 12, marginBottom: 2 }}><strong>Rigs:</strong> {stop.rigs.map(r=>r.rig_name).join(', ')}</div>
                        <div style={{ fontSize: 12, marginBottom: 2 }}><strong>County:</strong> {stop.county ? stop.county.charAt(0)+stop.county.slice(1).toLowerCase() : '—'}</div>
                        <div style={{ fontSize: 12 }}><strong>Drive from prev:</strong> {stop.distFromPrev.toFixed(1)} mi</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plan.map((d, di) => {
          const open = expandedDay === di;
          return (
            <div key={di} className="card" style={{ borderTop: `3px solid ${d.day.bg}`, overflow: 'hidden' }}>
              <div
                onClick={() => setExpandedDay(open ? -1 : di)}
                style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: open ? d.day.light : undefined }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: d.day.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{d.day.short}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: d.day.bg }}>{d.day.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.route.length} stops · ~{Math.round(d.totalMiles)} mi round trip · ~{Math.floor(d.driveHrs)}h {Math.round((d.driveHrs%1)*60)}m drive</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: d.day.bg }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {open && (
                <div className="table-wrapper">
                  <div style={{ padding: '6px 20px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e3a5f' }} />
                    <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 600 }}>START — Boerne, TX</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th>Operator(s)</th>
                        <th>Rigs</th>
                        <th>County</th>
                        <th style={{ textAlign: 'right' }}>Drive</th>
                        <th style={{ textAlign: 'right' }}>Time</th>
                        <th style={{ textAlign: 'right' }}>Cum.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.route.map((stop, si) => {
                        const hasPeak = stop.rigs.some(r => r.is_peak_rig);
                        return (
                          <tr key={si} style={{ background: hasPeak ? '#fff7ed' : undefined }}>
                            <td>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: d.day.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{si+1}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{stop.operators.join(', ')}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{stop.lat.toFixed(4)}°N, {Math.abs(stop.lon).toFixed(4)}°W</div>
                            </td>
                            <td>
                              {stop.rigs.map((r,ri) => (
                                <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                  {r.is_peak_rig && <svg width="8" height="8" viewBox="0 0 24 24" fill="#ea580c"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                                  {r.rig_name}
                                </div>
                              ))}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stop.county ? stop.county.charAt(0)+stop.county.slice(1).toLowerCase() : '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{stop.distFromPrev.toFixed(1)} mi</td>
                            <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{stop.driveMin} min</td>
                            <td style={{ textAlign: 'right', fontSize: 12, whiteSpace: 'nowrap' }}>{stop.cumMiles.toFixed(1)} mi</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e3a5f' }} />
                    <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 600 }}>RETURN — Boerne, TX</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>~{d.returnDist.toFixed(1)} mi from last stop</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: d.day.bg, marginLeft: 'auto' }}>Round trip: ~{Math.round(d.totalMiles)} mi</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Rigs() {
  const [summary, setSummary] = useState([]);
  const [rigs, setRigs] = useState([]);
  const [marketShare, setMarketShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rigs');
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [equipmentRig, setEquipmentRig] = useState(null);
  const [priceSheetOp, setPriceSheetOp] = useState(null);
  const [operators, setOperators] = useState([]);
  const [savingPeak, setSavingPeak] = useState({});
  const [operatorFilter, setOperatorFilter] = useState('');
  const [peakFilter, setPeakFilter] = useState(false);
  const [basinFilter, setBasinFilter] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');
  const [formationFilter, setFormationFilter] = useState('');
  const [drillTypeFilter, setDrillTypeFilter] = useState('');
  const [editingProb, setEditingProb] = useState(null);
  const [probDraft, setProbDraft] = useState('');
  const [savingProb, setSavingProb] = useState({});
  const [showCharts, setShowCharts] = useState(true);
  const [cmRig, setCmRig] = useState(null);
  const [cmForm, setCmForm] = useState({ company_man_day: '', company_man_night: '' });
  const [savingCm, setSavingCm] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, ms, ops] = await Promise.all([
        api.rigs.summary(),
        api.rigs.list(),
        api.rigs.marketShare(),
        api.operators.list(),
      ]);
      setSummary(s);
      setRigs(r);
      setMarketShare(ms);
      setOperators(ops);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const togglePeak = async (rig) => {
    setSavingPeak(p => ({ ...p, [rig.id]: true }));
    try {
      const updated = await api.rigs.setPeak(rig.id, { is_peak_rig: !rig.is_peak_rig });
      setRigs(prev => prev.map(r => r.id === rig.id ? { ...r, is_peak_rig: updated.is_peak_rig } : r));
      setMarketShare(null);
      api.rigs.marketShare().then(setMarketShare);
    } finally { setSavingPeak(p => ({ ...p, [rig.id]: false })); }
  };

  const startEditProb = (rig) => {
    setEditingProb(rig.id);
    setProbDraft(rig.win_probability !== null && rig.win_probability !== undefined ? String(rig.win_probability) : '');
  };

  const saveProb = async (rigId) => {
    setEditingProb(null);
    const raw = probDraft.trim();
    const val = raw === '' ? null : Math.min(100, Math.max(0, parseInt(raw, 10)));
    const current = rigs.find(r => r.id === rigId)?.win_probability ?? null;
    if (val === current) return;
    setSavingProb(p => ({ ...p, [rigId]: true }));
    try {
      const updated = await api.rigs.setProbability(rigId, { win_probability: val });
      setRigs(prev => prev.map(r => r.id === rigId ? { ...r, win_probability: updated.win_probability } : r));
    } finally { setSavingProb(p => ({ ...p, [rigId]: false })); }
  };

  const openCm = (rig) => {
    setCmRig(rig);
    setCmForm({ company_man_day: rig.company_man_day || '', company_man_night: rig.company_man_night || '' });
  };

  const saveCm = async () => {
    setSavingCm(true);
    try {
      const updated = await api.rigs.setCompanyMan(cmRig.id, cmForm);
      setRigs(prev => prev.map(r => r.id === cmRig.id ? { ...r, company_man_day: updated.company_man_day, company_man_night: updated.company_man_night } : r));
      setCmRig(null);
    } finally { setSavingCm(false); }
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) { setUploadStatus({ type: 'error', msg: 'Please upload a CSV file' }); return; }
    setUploading(true); setUploadStatus(null);
    try {
      const result = await api.rigs.uploadCSV(file);
      setUploadStatus({ type: 'success', msg: result.message });
      load();
    } catch (err) { setUploadStatus({ type: 'error', msg: err.message }); }
    finally { setUploading(false); }
  };

  const uniqueOps = [...new Set(rigs.map(r => r.operator_name).filter(Boolean))].sort();
  const uniqueBasins = [...new Set(rigs.map(r => r.basin).filter(Boolean))].sort();
  const uniqueContractors = [...new Set(rigs.map(r => r.contractor).filter(Boolean))].sort();
  const uniqueFormations = [...new Set(rigs.map(r => r.formation).filter(Boolean))].sort();
  const uniqueDrillTypes = [...new Set(rigs.map(r => r.drill_type).filter(Boolean))].sort();
  let filtered = rigs;
  if (operatorFilter) filtered = filtered.filter(r => r.operator_name === operatorFilter);
  if (basinFilter) filtered = filtered.filter(r => r.basin === basinFilter);
  if (contractorFilter) filtered = filtered.filter(r => r.contractor === contractorFilter);
  if (formationFilter) filtered = filtered.filter(r => r.formation === formationFilter);
  if (drillTypeFilter) filtered = filtered.filter(r => r.drill_type === drillTypeFilter);
  if (peakFilter) filtered = filtered.filter(r => r.is_peak_rig);

  const totalRigs = rigs.length;
  const peakRigs = rigs.filter(r => r.is_peak_rig).length;
  const peakPct = totalRigs > 0 ? ((peakRigs / totalRigs) * 100).toFixed(1) : '0.0';

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1>Rig Tracker</h1><p>{totalRigs} active US rigs · Enverus data · {uniqueBasins.length} basins</p></div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
          <div className="stat-content"><div className="value">{totalRigs}</div><div className="label">Total Active Rigs</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          <div className="stat-content"><div className="value">{peakRigs}</div><div className="label">Peak Rigs</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
          <div className="stat-content"><div className="value">{peakPct}%</div><div className="label">Market Share</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div className="stat-content"><div className="value">{uniqueOps.length}</div><div className="label">Operators</div></div>
        </div>
      </div>

      <div className="tabs">
        {['rigs','market-share','summary','map','route','upload'].map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'rigs' ? 'All Rigs' : t === 'market-share' ? 'Market Share' : t === 'summary' ? 'By Operator' : t === 'map' ? '🗺️ Rig Map' : t === 'route' ? '📍 Route Planner' : 'Upload CSV'}
          </button>
        ))}
      </div>

      {activeTab === 'rigs' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span className="card-title">Rigs ({filtered.length})</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="form-control" style={{ width: 160, fontSize: 12 }} value={basinFilter} onChange={e => setBasinFilter(e.target.value)}>
                <option value="">All Basins</option>
                {uniqueBasins.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className="form-control" style={{ width: 160, fontSize: 12 }} value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)}>
                <option value="">All Operators</option>
                {uniqueOps.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <select className="form-control" style={{ width: 160, fontSize: 12 }} value={contractorFilter} onChange={e => setContractorFilter(e.target.value)}>
                <option value="">All Contractors</option>
                {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="form-control" style={{ width: 155, fontSize: 12 }} value={formationFilter} onChange={e => setFormationFilter(e.target.value)}>
                <option value="">All Formations</option>
                {uniqueFormations.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="form-control" style={{ width: 130, fontSize: 12 }} value={drillTypeFilter} onChange={e => setDrillTypeFilter(e.target.value)}>
                <option value="">All Drill Types</option>
                {uniqueDrillTypes.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={peakFilter} onChange={e => setPeakFilter(e.target.checked)} />
                Peak rigs only
              </label>
              {(operatorFilter || peakFilter || basinFilter || contractorFilter || formationFilter || drillTypeFilter) && (
                <button className="btn btn-outline btn-sm" onClick={() => { setOperatorFilter(''); setPeakFilter(false); setBasinFilter(''); setContractorFilter(''); setFormationFilter(''); setDrillTypeFilter(''); }}>Clear</button>
              )}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowCharts(p => !p)}
                style={{ marginLeft: 4, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                {showCharts ? 'Hide Analysis' : 'Show Analysis'}
              </button>
            </div>
          </div>
          {showCharts && !loading && <RigPerformanceCharts filtered={filtered} />}
          <div className="table-wrapper">
            {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
              <table>
                <thead>
                  <tr>
                    <th>Peak Rig</th>
                    <th>Rig / Contractor</th>
                    <th>Operator</th>
                    <th>Basin</th>
                    <th>County, State</th>
                    <th>Formation</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Drill Type</th>
                    <th>Spud Date</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Win %</th>
                    <th>Company Man</th>
                    <th>Equipment</th>
                    <th>Price Sheet</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(rig => {
                    const op = operators.find(o => o.name === rig.operator_name);
                    return (
                      <tr key={rig.id} style={{ background: rig.is_peak_rig ? 'rgba(234,88,12,0.04)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => togglePeak(rig)}
                            disabled={!!savingPeak[rig.id]}
                            title={rig.is_peak_rig ? 'Mark as NOT a Peak rig' : 'Mark as Peak rig'}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                              color: rig.is_peak_rig ? '#ea580c' : 'var(--border)',
                              transition: 'color 0.15s, transform 0.1s',
                              transform: savingPeak[rig.id] ? 'scale(0.85)' : 'scale(1)'
                            }}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill={rig.is_peak_rig ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          </button>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{rig.rig_name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rig.contractor || rig.rig_number || ''}</div>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 500 }}>{rig.operator_name}</td>
                        <td style={{ fontSize: 12 }}>
                          <span className="badge badge-blue" style={{ fontSize: 11 }}>{rig.basin || '—'}</span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {rig.county ? rig.county.charAt(0)+rig.county.slice(1).toLowerCase() : ''}
                          {rig.county && rig.state ? ', ' : ''}{rig.state || '—'}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rig.formation || '—'}
                        </td>
                        <td style={{ fontSize: 11 }}>
                          {rig.drill_type ? (
                            <span style={{
                              display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                              background: rig.drill_type === 'Horizontal' ? '#dbeafe' : rig.drill_type === 'Vertical' ? '#dcfce7' : '#f3f4f6',
                              color: rig.drill_type === 'Horizontal' ? '#1d4ed8' : rig.drill_type === 'Vertical' ? '#16a34a' : '#374151'
                            }}>{rig.drill_type}</span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {rig.spud_date ? new Date(rig.spud_date).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'center', width: 110 }}>
                          {editingProb === rig.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                              <input
                                type="number" min="0" max="100"
                                value={probDraft}
                                autoFocus
                                onChange={e => setProbDraft(e.target.value)}
                                onBlur={() => saveProb(rig.id)}
                                onKeyDown={e => { if (e.key === 'Enter') saveProb(rig.id); if (e.key === 'Escape') setEditingProb(null); }}
                                style={{ width: 58, padding: '3px 8px', border: '2px solid var(--primary)', borderRadius: 7, fontSize: 13, textAlign: 'center', fontWeight: 700 }}
                              />
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditProb(rig)}
                              disabled={!!savingProb[rig.id]}
                              title="Click to set win probability"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}
                            >
                              {savingProb[rig.id] ? (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>saving…</span>
                              ) : (() => {
                                const p = rig.win_probability;
                                if (p === null || p === undefined) return (
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', border: '1.5px dashed var(--border)', borderRadius: 99, padding: '2px 10px', display: 'inline-block' }}>Set %</span>
                                );
                                const color = p >= 75 ? '#10b981' : p >= 50 ? '#3b82f6' : p >= 25 ? '#f59e0b' : '#ef4444';
                                const bg = p >= 75 ? '#ecfdf5' : p >= 50 ? '#eff6ff' : p >= 25 ? '#fffbeb' : '#fef2f2';
                                const border = p >= 75 ? '#a7f3d0' : p >= 50 ? '#bfdbfe' : p >= 25 ? '#fde68a' : '#fecaca';
                                return (
                                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                    <span style={{ background: bg, color, border: `1.5px solid ${border}`, borderRadius: 99, padding: '2px 10px', fontWeight: 800, fontSize: 13, display: 'inline-block', lineHeight: 1.4 }}>{p}%</span>
                                    <div style={{ width: 60, height: 4, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                                      <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 99 }} />
                                    </div>
                                  </div>
                                );
                              })()}
                            </button>
                          )}
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <button
                            onClick={() => openCm(rig)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%' }}
                            title="Click to assign company men"
                          >
                            {(rig.company_man_day || rig.company_man_night) ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {rig.company_man_day && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                                    <span title="Day shift" style={{ fontSize: 13 }}>☀️</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rig.company_man_day}</span>
                                  </div>
                                )}
                                {rig.company_man_night && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                                    <span title="Night shift" style={{ fontSize: 13 }}>🌙</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rig.company_man_night}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', border: '1.5px dashed var(--border)', borderRadius: 6, padding: '3px 10px', display: 'inline-block' }}>Assign</span>
                            )}
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => setEquipmentRig(rig)}>
                            Checklist
                          </button>
                        </td>
                        <td>
                          {op && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: 11, color: op?.price_sheet_name ? 'var(--primary)' : undefined }}
                              onClick={() => setPriceSheetOp(op)}
                            >
                              {op?.price_sheet_name ? '📄 View' : 'Upload'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={10}><div className="empty-state"><p>No rigs found</p></div></td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'market-share' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Market Share by Operator</span></div>
          <div className="table-wrapper">
            {!marketShare ? <div className="loading"><div className="spinner"/>Loading...</div> : (
              <table>
                <thead>
                  <tr><th>Operator</th><th>Total Rigs</th><th>Peak Rigs</th><th>Market Share</th><th></th></tr>
                </thead>
                <tbody>
                  {marketShare.byOperator.map(row => {
                    const pct = parseFloat(row.peak_share_pct || 0);
                    return (
                      <tr key={row.operator_name}>
                        <td style={{ fontWeight: 600 }}>{row.operator_name}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{row.total_rigs}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: parseInt(row.peak_rigs) > 0 ? '#ea580c' : 'var(--text-muted)' }}>
                            {row.peak_rigs}
                          </span>
                        </td>
                        <td style={{ width: 220 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pct > 0 ? 'linear-gradient(90deg, #ea580c, #f97316)' : 'transparent', borderRadius: 4, transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: pct > 0 ? '#ea580c' : 'var(--text-muted)', width: 44 }}>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => { setOperatorFilter(row.operator_name); setActiveTab('rigs'); }}>
                            View Rigs
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {marketShare.byOperator.length === 0 && <tr><td colSpan={5}><div className="empty-state"><p>No data</p></div></td></tr>}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                    <td>TOTAL</td>
                    <td style={{ textAlign: 'center' }}>{marketShare.totals?.total_rigs || 0}</td>
                    <td style={{ textAlign: 'center', color: '#ea580c' }}>{marketShare.totals?.peak_rigs || 0}</td>
                    <td colSpan={2}>
                      <span style={{ color: '#ea580c' }}>
                        {marketShare.totals?.total_rigs > 0
                          ? ((marketShare.totals.peak_rigs / marketShare.totals.total_rigs) * 100).toFixed(1)
                          : '0.0'}% overall market share
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Rigs by Operator</span></div>
          <div className="table-wrapper">
            {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
              <table>
                <thead>
                  <tr><th>Operator</th><th>Basin</th><th>Active Rigs</th><th>Rev/Rig</th><th>Revenue Potential</th><th>Price Sheet</th></tr>
                </thead>
                <tbody>
                  {summary.filter(r => parseInt(r.active_rigs) > 0).map((r, i) => {
                    const op = operators.find(o => o.name === r.operator_name);
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.operator_name}</td>
                        <td><span className="badge badge-blue">{r.basin || '—'}</span></td>
                        <td><span style={{ fontWeight: 700, fontSize: 18 }}>{r.active_rigs || 0}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>${parseFloat(r.revenue_per_rig || 0).toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>${parseFloat(r.revenue_potential || 0).toLocaleString()}</td>
                        <td>
                          {op && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: 11, color: op?.price_sheet_name ? 'var(--primary)' : undefined }}
                              onClick={() => setPriceSheetOp(op)}
                            >
                              {op?.price_sheet_name ? '📄 View' : 'Upload'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {summary.filter(r => parseInt(r.active_rigs) > 0).length === 0 && (
                    <tr><td colSpan={6}><div className="empty-state"><p>No rig data yet. Upload a CSV to get started.</p></div></td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'map' && <RigMap rigs={rigs} />}

      {activeTab === 'route' && <RoutePlanner rigs={rigs} />}

      {activeTab === 'upload' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Upload Enverus Rig Data (CSV)</span></div>
          <div className="card-body">
            {uploadStatus && (
              <div className={`alert alert-${uploadStatus.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
                {uploadStatus.msg}
              </div>
            )}
            <div className={`file-upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{uploading ? 'Uploading...' : 'Click or drop CSV file here'}</p>
              <p style={{ fontSize: 12 }}>Enverus rig data format</p>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!cmRig}
        onClose={() => setCmRig(null)}
        title={`Company Man — ${cmRig?.rig_name || 'Rig'}`}
        footer={<>
          <button className="btn btn-outline" onClick={() => setCmRig(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveCm} disabled={savingCm}>{savingCm ? 'Saving…' : 'Save'}</button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: '12px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
            <strong>{cmRig?.operator_name}</strong> · {cmRig?.rig_name} · {[cmRig?.county, cmRig?.state].filter(Boolean).join(', ')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#b45309', marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>☀️</span> Day Shift Company Man
              </label>
              <input
                className="form-control"
                placeholder="Full name of day shift company man…"
                value={cmForm.company_man_day}
                onChange={e => setCmForm(f => ({ ...f, company_man_day: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveCm()}
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🌙</span> Night Shift Company Man
              </label>
              <input
                className="form-control"
                placeholder="Full name of night shift company man…"
                value={cmForm.company_man_night}
                onChange={e => setCmForm(f => ({ ...f, company_man_night: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveCm()}
              />
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
            Leave a field blank to clear that shift assignment.
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!equipmentRig} onClose={() => setEquipmentRig(null)} title="Equipment Checklist">
        {equipmentRig && <EquipmentModal rig={equipmentRig} onClose={() => setEquipmentRig(null)} />}
      </Modal>

      <Modal isOpen={!!priceSheetOp} onClose={() => setPriceSheetOp(null)} title="Price Sheet">
        {priceSheetOp && <PriceSheetModal operator={priceSheetOp} onClose={() => setPriceSheetOp(null)} onUploaded={load} />}
      </Modal>
    </div>
  );
}
