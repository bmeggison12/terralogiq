import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function Territories({ user }) {
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTerritory, setEditTerritory] = useState(null);
  const [accessModal, setAccessModal] = useState(null);
  const [accessData, setAccessData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  const [form, setForm] = useState({ name: '', states: '', center_lat: '', center_lon: '', zoom_level: 7, color: '#1e3a5f', sort_order: 99 });

  const isAdmin = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.territories.listAll();
      setTerritories(data);
    } catch { setTerritories([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ name: '', states: '', center_lat: '', center_lon: '', zoom_level: 7, color: '#1e3a5f', sort_order: 99 });
    setEditTerritory(null);
    setShowAddModal(true);
    setError('');
  };

  const openEdit = (t) => {
    setForm({
      name: t.name, states: t.states || '', center_lat: t.center_lat || '',
      center_lon: t.center_lon || '', zoom_level: t.zoom_level || 7,
      color: t.color || '#1e3a5f', sort_order: t.sort_order || 99
    });
    setEditTerritory(t);
    setShowAddModal(true);
    setError('');
  };

  const saveTerritory = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editTerritory) {
        await api.territories.update(editTerritory.id, form);
      } else {
        await api.territories.create(form);
      }
      setShowAddModal(false);
      await load();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const deleteTerritory = async (t) => {
    if (!confirm(`Delete "${t.name}"? Operators and rigs assigned to it will be unlinked.`)) return;
    await api.territories.remove(t.id);
    await load();
  };

  const openAccess = async (t) => {
    setAccessModal(t);
    const data = await api.territories.getUsers(t.id);
    setAccessData(data);
  };

  const assignUser = async (userId) => {
    await api.territories.addUser(accessModal.id, userId);
    const data = await api.territories.getUsers(accessModal.id);
    setAccessData(data);
  };

  const removeUser = async (userId) => {
    await api.territories.removeUser(accessModal.id, userId);
    const data = await api.territories.getUsers(accessModal.id);
    setAccessData(data);
  };

  const seedDefaults = async () => {
    if (!confirm('This will add all major US shale plays as territories. Existing ones will be skipped. Continue?')) return;
    setSeeding(true);
    try {
      await api.territories.seedDefaults();
      await load();
    } catch { }
    setSeeding(false);
  };

  const COLORS = ['#8b5cf6','#0ea5e9','#f97316','#84cc16','#eab308','#a855f7','#6366f1','#64748b','#f59e0b','#ef4444','#ec4899','#14b8a6','#0891b2','#10b981','#06b6d4','#22c55e','#1e3a5f','#dc2626'];

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>
            {territories.length} territories configured
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Assign operators and rigs to territories, then control which users have access.
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={seedDefaults} disabled={seeding}>
              {seeding ? 'Adding...' : '🌎 Add All US Shale Plays'}
            </button>
            <button className="btn btn-accent" onClick={openAdd}>+ Add Territory</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : territories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No territories yet</div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={seedDefaults}>Add All US Shale Plays</button>
              <button className="btn btn-secondary" onClick={openAdd}>Create Custom Territory</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {territories.map(t => (
            <div key={t.id} className="card" style={{ borderLeft: `4px solid ${t.color}`, margin: 0 }}>
              <div className="card-header" style={{ paddingBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <span className="card-title" style={{ fontSize: 15 }}>{t.name}</span>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => openAccess(t)} title="Manage user access">
                      👥 Access
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444' }}
                      onClick={() => deleteTerritory(t)}>✕</button>
                  </div>
                )}
              </div>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t.states && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', marginBottom: 2 }}>STATES</span>
                      {t.states}
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', marginBottom: 2 }}>OPERATORS</span>
                    {t.operator_count ?? 0}
                  </div>
                  {t.center_lat && t.center_lon && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', marginBottom: 2 }}>MAP CENTER</span>
                      {parseFloat(t.center_lat).toFixed(2)}°N, {parseFloat(t.center_lon).toFixed(2)}°W
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editTerritory ? 'Edit Territory' : 'Add Territory'}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="error-msg">{error}</div>}
              <form onSubmit={saveTerritory}>
                <div className="form-group">
                  <label className="form-label">Territory Name *</label>
                  <input className="form-control" required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Permian Basin" />
                </div>
                <div className="form-group">
                  <label className="form-label">States / Region</label>
                  <input className="form-control" value={form.states}
                    onChange={e => setForm(f => ({ ...f, states: e.target.value }))}
                    placeholder="e.g. TX, NM" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Center Lat</label>
                    <input className="form-control" type="number" step="0.0001" value={form.center_lat}
                      onChange={e => setForm(f => ({ ...f, center_lat: e.target.value }))}
                      placeholder="31.8" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Center Lon</label>
                    <input className="form-control" type="number" step="0.0001" value={form.center_lon}
                      onChange={e => setForm(f => ({ ...f, center_lon: e.target.value }))}
                      placeholder="-102.5" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Zoom</label>
                    <input className="form-control" type="number" min="4" max="14" value={form.zoom_level}
                      onChange={e => setForm(f => ({ ...f, zoom_level: parseInt(e.target.value) }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Display Color</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--primary)' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input className="form-control" type="number" value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-accent" disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Saving...' : 'Save Territory'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {accessModal && (
        <div className="modal-overlay" onClick={() => { setAccessModal(null); setAccessData(null); }}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ marginBottom: 2 }}>User Access</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{accessModal.name}</div>
              </div>
              <button className="modal-close" onClick={() => { setAccessModal(null); setAccessData(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                Admins always have access to all territories. Assign Sales and Exec users to limit their view.
              </div>
              {!accessData ? (
                <div className="loading"><div className="spinner" />Loading...</div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Users with Access</div>
                    {accessData.assigned.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No restricted users assigned — all users can see this territory.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {accessData.assigned.map(u => (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                            <div>
                              <span style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{u.email}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8, textTransform: 'uppercase' }}>{u.role}</span>
                            </div>
                            <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11, color: '#ef4444' }}
                              onClick={() => removeUser(u.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Add User to Territory</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {accessData.all.filter(u => u.role !== 'admin' && !accessData.assigned.find(a => a.id === u.id)).map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)', opacity: 0.7 }}>
                          <div>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{u.email}</span>
                          </div>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => assignUser(u.id)}>+ Assign</button>
                        </div>
                      ))}
                      {accessData.all.filter(u => u.role !== 'admin').length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No non-admin users in your company yet.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
