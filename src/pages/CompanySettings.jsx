import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';

const PRODUCT_CATEGORIES = [
  'Light Towers', 'Power Generation', 'Man Camps / Accommodations', 'Wellhead Equipment',
  'Pumping Units', 'Tanks / Vessels', 'Compressors', 'Generators', 'Tools / Rentals',
  'Services / Labor', 'Chemical / Fluids', 'Software / Technology', 'Safety Equipment', 'Other'
];

const SITE_TYPES = ['Rig Site', 'Frac Site', 'Production Site', 'Pipeline', 'Office / Yard', 'Processing Facility', 'Other'];

const INDUSTRY_OPTIONS = [
  'Oil & Gas', 'Mining', 'Construction', 'Industrial Services', 'Midstream',
  'Pipeline', 'Water Services', 'Environmental Services', 'Power Generation', 'Other'
];

const COLORS = ['#1e3a5f','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899','#64748b','#0d9488','#dc2626'];

function fmtCurrency(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function FileIcon({ type }) {
  const t = (type || '').toLowerCase();
  if (t.includes('pdf')) return <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 12 }}>PDF</span>;
  if (t.includes('excel') || t.includes('spreadsheet') || t.includes('xlsx')) return <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}>XLS</span>;
  if (t.includes('image') || t.includes('png') || t.includes('jpg')) return <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: 12 }}>IMG</span>;
  return <span style={{ color: '#64748b', fontWeight: 700, fontSize: 12 }}>DOC</span>;
}

export default function CompanySettings({ user, onCompanyUpdate }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [products, setProducts] = useState([]);
  const [productModal, setProductModal] = useState(null);
  const [productForm, setProductForm] = useState({});

  const [priceSheets, setPriceSheets] = useState([]);
  const [uploadingSheet, setUploadingSheet] = useState(false);
  const [sheetName, setSheetName] = useState('');
  const [sheetNotes, setSheetNotes] = useState('');
  const sheetFileRef = useRef();

  const [activeSites, setActiveSites] = useState([]);
  const [siteModal, setSiteModal] = useState(null);
  const [siteForm, setSiteForm] = useState({});
  const [operators, setOperators] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prof, prods, sheets, sites, ops] = await Promise.all([
        api.company.getProfile(),
        api.company.getProducts(),
        api.company.getPriceSheets(),
        api.company.getActiveSites(),
        api.operators.list(),
      ]);
      setProfile(prof);
      setProfileForm({
        name: prof.name || '',
        tagline: prof.tagline || '',
        description: prof.description || '',
        primary_color: prof.primary_color || '#1e3a5f',
        hq_city: prof.hq_city || '',
        hq_state: prof.hq_state || '',
        website: prof.website || '',
        phone: prof.phone || '',
        industry_focus: prof.industry_focus || 'Oil & Gas',
        what_we_sell: prof.what_we_sell || '',
      });
      setProducts(prods);
      setPriceSheets(sheets);
      setActiveSites(sites);
      setOperators(ops);
    } finally { setLoading(false); }
  };

  const flash = (msg, isErr = false) => {
    setSaveMsg({ msg, isErr });
    setTimeout(() => setSaveMsg(null), 3500);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.company.updateProfile(profileForm);
      setProfile(updated);
      if (onCompanyUpdate) onCompanyUpdate(updated);
      flash('Company profile saved');
    } catch (e) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const uploadLogo = async (file) => {
    setLogoUploading(true);
    try {
      const res = await api.company.uploadLogo(file);
      setProfile(p => ({ ...p, logo_data: res.logo_data }));
      if (onCompanyUpdate) onCompanyUpdate({ logo_data: res.logo_data });
      flash('Logo uploaded');
    } catch (e) { flash(e.message, true); }
    finally { setLogoUploading(false); }
  };

  const deleteLogo = async () => {
    if (!confirm('Remove company logo?')) return;
    await api.company.deleteLogo();
    setProfile(p => ({ ...p, logo_data: null }));
    if (onCompanyUpdate) onCompanyUpdate({ logo_data: null });
  };

  // Products
  const openAddProduct = () => {
    setProductForm({ name: '', description: '', category: '', daily_rate: '', weekly_rate: '', monthly_rate: '', unit: 'unit', specs: '' });
    setProductModal('add');
  };
  const openEditProduct = (p) => {
    setProductForm({ ...p, daily_rate: p.daily_rate || '', weekly_rate: p.weekly_rate || '', monthly_rate: p.monthly_rate || '' });
    setProductModal('edit');
  };
  const saveProduct = async () => {
    setSaving(true);
    try {
      if (productModal === 'add') {
        const created = await api.company.createProduct(productForm);
        setProducts(ps => [...ps, created]);
      } else {
        const updated = await api.company.updateProduct(productForm.id, productForm);
        setProducts(ps => ps.map(p => p.id === productForm.id ? updated : p));
      }
      setProductModal(null);
    } catch (e) { flash(e.message, true); }
    finally { setSaving(false); }
  };
  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.company.deleteProduct(id);
    setProducts(ps => ps.filter(p => p.id !== id));
  };
  const uploadProductImage = async (id, file) => {
    const updated = await api.company.uploadProductImage(id, file);
    setProducts(ps => ps.map(p => p.id === id ? updated : p));
  };

  // Price Sheets
  const uploadSheet = async (file) => {
    setUploadingSheet(true);
    try {
      const result = await api.company.uploadPriceSheet(file, sheetName || file.name, sheetNotes);
      setPriceSheets(ps => [result, ...ps]);
      setSheetName(''); setSheetNotes('');
      if (sheetFileRef.current) sheetFileRef.current.value = '';
      flash('Price sheet uploaded');
    } catch (e) { flash(e.message, true); }
    finally { setUploadingSheet(false); }
  };
  const downloadSheet = async (sheet) => {
    try {
      const { file_data, file_name } = await api.company.downloadPriceSheet(sheet.id);
      const link = document.createElement('a');
      link.href = file_data;
      link.download = file_name;
      link.click();
    } catch (e) { alert(e.message); }
  };
  const deleteSheet = async (id) => {
    if (!confirm('Delete this price sheet?')) return;
    await api.company.deletePriceSheet(id);
    setPriceSheets(ps => ps.filter(s => s.id !== id));
  };

  // Active Sites
  const openAddSite = () => {
    setSiteForm({ site_name: '', site_type: 'Rig Site', county: '', state: '', products_on_site: '', units_count: 1, start_date: '', notes: '', operator_id: '', is_active: true });
    setSiteModal('add');
  };
  const openEditSite = (s) => {
    setSiteForm({ ...s, operator_id: s.operator_id || '', start_date: s.start_date ? s.start_date.split('T')[0] : '' });
    setSiteModal('edit');
  };
  const saveSite = async () => {
    setSaving(true);
    try {
      if (siteModal === 'add') {
        const created = await api.company.createActiveSite(siteForm);
        setActiveSites(ss => [created, ...ss]);
      } else {
        const updated = await api.company.updateActiveSite(siteForm.id, siteForm);
        setActiveSites(ss => ss.map(s => s.id === siteForm.id ? updated : s));
      }
      setSiteModal(null);
    } catch (e) { flash(e.message, true); }
    finally { setSaving(false); }
  };
  const deleteSite = async (id) => {
    if (!confirm('Remove this active site?')) return;
    await api.company.deleteActiveSite(id);
    setActiveSites(ss => ss.filter(s => s.id !== id));
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading settings...</div>;

  const isAdmin = user?.role === 'admin';

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Company Settings</h1>
          <p>Customize your workspace, products, rate cards, and active deployments</p>
        </div>
      </div>

      {saveMsg && (
        <div style={{ margin: '0 0 16px', padding: '10px 16px', borderRadius: 8, background: saveMsg.isErr ? '#fef2f2' : '#f0fdf4', border: `1px solid ${saveMsg.isErr ? '#fca5a5' : '#86efac'}`, color: saveMsg.isErr ? '#dc2626' : '#16a34a', fontSize: 13, fontWeight: 500 }}>
          {saveMsg.msg}
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'profile', label: 'Company Profile' },
          { key: 'products', label: 'Products & Services' },
          { key: 'rate-cards', label: 'Rate Cards' },
          { key: 'active-sites', label: 'Active Deployments' },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── PROFILE TAB ─────────────────────────────── */}
      {tab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Company Identity</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input className="form-control" value={profileForm.name || ''} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Oilfield Services" />
              </div>
              <div className="form-group">
                <label className="form-label">Tagline / Slogan</label>
                <input className="form-control" value={profileForm.tagline || ''} onChange={e => setProfileForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Powering the Permian since 1987" />
              </div>
              <div className="form-group">
                <label className="form-label">Industry Focus</label>
                <select className="form-control" value={profileForm.industry_focus || ''} onChange={e => setProfileForm(f => ({ ...f, industry_focus: e.target.value }))}>
                  {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={3} value={profileForm.description || ''} onChange={e => setProfileForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of your company and what you do..." />
              </div>
              <div className="form-group">
                <label className="form-label">What We Sell / Offer</label>
                <textarea className="form-control" rows={3} value={profileForm.what_we_sell || ''} onChange={e => setProfileForm(f => ({ ...f, what_we_sell: e.target.value }))} placeholder="e.g., Light towers, man camps, wellhead equipment, generator rentals..." />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Logo</span></div>
              <div className="card-body">
                {profile?.logo_data ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <img src={profile.logo_data} alt="Company logo" style={{ height: 80, maxWidth: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', padding: 8, background: 'white' }} />
                    <div>
                      <label className="btn btn-outline btn-sm" style={{ display: 'block', marginBottom: 8, cursor: 'pointer' }}>
                        Replace Logo
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadLogo(e.target.files[0])} />
                      </label>
                      <button className="btn btn-danger btn-sm" onClick={deleteLogo}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px', border: '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span style={{ fontSize: 13 }}>{logoUploading ? 'Uploading...' : 'Click to upload logo (PNG, JPG, SVG)'}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadLogo(e.target.files[0])} disabled={logoUploading} />
                  </label>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Brand Color</span></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setProfileForm(f => ({ ...f, primary_color: c }))}
                      style={{ width: 36, height: 36, borderRadius: '50%', background: c, border: profileForm.primary_color === c ? '3px solid var(--text-primary)' : '3px solid transparent', cursor: 'pointer', boxShadow: profileForm.primary_color === c ? '0 0 0 2px white, 0 0 0 4px ' + c : 'none', transition: 'all 0.15s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={profileForm.primary_color || '#1e3a5f'} onChange={e => setProfileForm(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 40, height: 36, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }} />
                  <input className="form-control" value={profileForm.primary_color || ''} onChange={e => setProfileForm(f => ({ ...f, primary_color: e.target.value }))} style={{ fontFamily: 'monospace', width: 110 }} placeholder="#1e3a5f" />
                  <div style={{ width: 40, height: 36, borderRadius: 6, background: profileForm.primary_color, border: '1px solid var(--border)' }} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Contact & Location</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">HQ City</label>
                    <input className="form-control" value={profileForm.hq_city || ''} onChange={e => setProfileForm(f => ({ ...f, hq_city: e.target.value }))} placeholder="Midland" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">HQ State</label>
                    <input className="form-control" value={profileForm.hq_state || ''} onChange={e => setProfileForm(f => ({ ...f, hq_state: e.target.value }))} placeholder="TX" />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Website</label>
                  <input className="form-control" value={profileForm.website || ''} onChange={e => setProfileForm(f => ({ ...f, website: e.target.value }))} placeholder="https://yourcompany.com" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={profileForm.phone || ''} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="(432) 555-0100" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving || !isAdmin}>
              {saving ? 'Saving...' : 'Save Company Profile'}
            </button>
            {!isAdmin && <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Admin access required to edit</span>}
          </div>
        </div>
      )}

      {/* ─── PRODUCTS & SERVICES TAB ─────────────────── */}
      {tab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Products & Services Catalog</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Define what your company sells or rents. Rates appear in revenue calculations.</div>
            </div>
            {isAdmin && <button className="btn btn-primary" onClick={openAddProduct}>+ Add Product</button>}
          </div>

          {products.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No products added yet</div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>Add the products and services your team sells to use in revenue calculations and reporting.</div>
              {isAdmin && <button className="btn btn-primary" onClick={openAddProduct}>Add Your First Product</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {products.map(p => (
                <div key={p.id} className="card" style={{ opacity: p.is_active ? 1 : 0.6 }}>
                  {p.image_data && (
                    <img src={p.image_data} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                  )}
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                        {p.category && <span className="badge badge-blue" style={{ fontSize: 10, marginTop: 4 }}>{p.category}</span>}
                      </div>
                      {!p.is_active && <span style={{ fontSize: 10, padding: '2px 8px', background: '#f3f4f6', borderRadius: 100, color: '#9ca3af' }}>Inactive</span>}
                    </div>
                    {p.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.4 }}>{p.description}</div>}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      {p.daily_rate && <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--surface-2)', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{fmtCurrency(p.daily_rate)}</div>
                      </div>}
                      {p.weekly_rate && <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--surface-2)', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Weekly</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{fmtCurrency(p.weekly_rate)}</div>
                      </div>}
                      {p.monthly_rate && <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--surface-2)', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monthly</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{fmtCurrency(p.monthly_rate)}</div>
                      </div>}
                    </div>
                    {p.specs && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>{p.specs}</div>}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEditProduct(p)} style={{ flex: 1 }}>Edit</button>
                        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                          Photo
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadProductImage(p.id, e.target.files[0])} />
                        </label>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── RATE CARDS TAB ──────────────────────────── */}
      {tab === 'rate-cards' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Upload Rate Card / Price Sheet</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Sheet Name</label>
                  <input className="form-control" value={sheetName} onChange={e => setSheetName(e.target.value)} placeholder="e.g., Q2 2026 Standard Rate Card" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-control" rows={2} value={sheetNotes} onChange={e => setSheetNotes(e.target.value)} placeholder="Any notes about this rate card..." />
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px', border: '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span style={{ fontSize: 13 }}>{uploadingSheet ? 'Uploading...' : 'Click to upload PDF, Excel, or image'}</span>
                  <input ref={sheetFileRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }}
                    onChange={e => e.target.files[0] && uploadSheet(e.target.files[0])} disabled={uploadingSheet || !isAdmin} />
                </label>
                {!isAdmin && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Admin access required to upload</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Rate Cards ({priceSheets.length})</span></div>
              <div className="card-body" style={{ padding: 0 }}>
                {priceSheets.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 13 }}>No rate cards uploaded yet.</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Upload your price sheets for easy access by the team.</div>
                  </div>
                ) : (
                  <div>
                    {priceSheets.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileIcon type={s.file_type} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.file_name} · {new Date(s.created_at).toLocaleDateString()}</div>
                          {s.notes && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => downloadSheet(s)}>Download</button>
                          {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => deleteSheet(s.id)}>✕</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ACTIVE DEPLOYMENTS TAB ──────────────────── */}
      {tab === 'active-sites' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Active Deployments</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Track where your company currently has equipment or services deployed in the field.</div>
            </div>
            <button className="btn btn-primary" onClick={openAddSite}>+ Add Deployment</button>
          </div>

          <div className="card">
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {activeSites.filter(s => s.is_active).length} Active · {activeSites.filter(s => !s.is_active).length} Inactive
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {activeSites.reduce((t, s) => t + (s.units_count || 0), 0)} total units deployed
              </span>
            </div>
            {activeSites.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No deployments tracked yet</div>
                <div style={{ fontSize: 13 }}>Track where you currently have equipment or services on site.</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Site</th>
                      <th>Operator</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Products on Site</th>
                      <th style={{ textAlign: 'center' }}>Units</th>
                      <th>Start Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSites.map(s => (
                      <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.55 }}>
                        <td>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: s.is_active ? '#10b981' : '#9ca3af' }} />
                          {' '}<span style={{ fontSize: 11, color: s.is_active ? '#10b981' : '#9ca3af', fontWeight: 600 }}>{s.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{s.site_name || '—'}</td>
                        <td style={{ fontSize: 12 }}>{s.operator_name || '—'}</td>
                        <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{s.site_type || '—'}</span></td>
                        <td style={{ fontSize: 12 }}>{[s.county, s.state].filter(Boolean).join(', ') || '—'}</td>
                        <td style={{ fontSize: 12, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.products_on_site || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.units_count || 1}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.start_date ? new Date(s.start_date).toLocaleDateString() : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openEditSite(s)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteSite(s.id)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PRODUCT MODAL ───────────────────────────── */}
      {productModal && (
        <div className="modal-overlay" onClick={() => setProductModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{productModal === 'add' ? 'Add Product / Service' : 'Edit Product'}</h2>
              <button className="modal-close" onClick={() => setProductModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Product / Service Name *</label>
                <input className="form-control" value={productForm.name || ''} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., 4-string Light Tower" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={productForm.category || ''} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category...</option>
                  {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={2} value={productForm.description || ''} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Daily Rate</label>
                  <input className="form-control" type="number" value={productForm.daily_rate || ''} onChange={e => setProductForm(f => ({ ...f, daily_rate: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Weekly Rate</label>
                  <input className="form-control" type="number" value={productForm.weekly_rate || ''} onChange={e => setProductForm(f => ({ ...f, weekly_rate: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Monthly Rate</label>
                  <input className="form-control" type="number" value={productForm.monthly_rate || ''} onChange={e => setProductForm(f => ({ ...f, monthly_rate: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Unit</label>
                  <input className="form-control" value={productForm.unit || ''} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} placeholder="unit" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Specs / Notes</label>
                <textarea className="form-control" rows={2} value={productForm.specs || ''} onChange={e => setProductForm(f => ({ ...f, specs: e.target.value }))} placeholder="e.g., 6kW, diesel, 360° illumination, trailer-mounted" />
              </div>
              {productModal === 'edit' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!productForm.is_active} onChange={e => setProductForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Active (visible in catalog)
                </label>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setProductModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveProduct} disabled={saving || !productForm.name}>{saving ? 'Saving...' : 'Save Product'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ACTIVE SITE MODAL ───────────────────────── */}
      {siteModal && (
        <div className="modal-overlay" onClick={() => setSiteModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{siteModal === 'add' ? 'Add Deployment' : 'Edit Deployment'}</h2>
              <button className="modal-close" onClick={() => setSiteModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Site Name</label>
                <input className="form-control" value={siteForm.site_name || ''} onChange={e => setSiteForm(f => ({ ...f, site_name: e.target.value }))} placeholder="e.g., Pioneer Pad A — Midland Co." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Operator</label>
                  <select className="form-control" value={siteForm.operator_id || ''} onChange={e => setSiteForm(f => ({ ...f, operator_id: e.target.value }))}>
                    <option value="">Select operator...</option>
                    {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Site Type</label>
                  <select className="form-control" value={siteForm.site_type || ''} onChange={e => setSiteForm(f => ({ ...f, site_type: e.target.value }))}>
                    {SITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">County</label>
                  <input className="form-control" value={siteForm.county || ''} onChange={e => setSiteForm(f => ({ ...f, county: e.target.value }))} placeholder="Midland" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">State</label>
                  <input className="form-control" value={siteForm.state || ''} onChange={e => setSiteForm(f => ({ ...f, state: e.target.value }))} placeholder="TX" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Products / Equipment on Site</label>
                <input className="form-control" value={siteForm.products_on_site || ''} onChange={e => setSiteForm(f => ({ ...f, products_on_site: e.target.value }))} placeholder="e.g., 3x Light Towers, 2x Man Camps" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Unit Count</label>
                  <input className="form-control" type="number" value={siteForm.units_count || 1} onChange={e => setSiteForm(f => ({ ...f, units_count: parseInt(e.target.value) || 1 }))} min={1} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Start Date</label>
                  <input className="form-control" type="date" value={siteForm.start_date || ''} onChange={e => setSiteForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} value={siteForm.notes || ''} onChange={e => setSiteForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {siteModal === 'edit' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!siteForm.is_active} onChange={e => setSiteForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Currently active
                </label>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSiteModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSite} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
