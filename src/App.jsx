import React, { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Operators from './pages/Operators.jsx';
import Rigs from './pages/Rigs.jsx';
import Opportunities from './pages/Opportunities.jsx';
import SalesLogs from './pages/SalesLogs.jsx';
import MSATracker from './pages/MSATracker.jsx';
import Reports from './pages/Reports.jsx';
import FracSites from './pages/FracSites.jsx';
import JobSites from './pages/JobSites.jsx';
import MarketShare from './pages/MarketShare.jsx';
import RevenueCalculator from './pages/RevenueCalculator.jsx';
import Contacts from './pages/Contacts.jsx';
import Activities from './pages/Activities.jsx';
import Territories from './pages/Territories.jsx';
import CompanySettings from './pages/CompanySettings.jsx';
import { TerritoryProvider, useTerritory } from './context/TerritoryContext.jsx';

const NAV = [
  {
    section: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    ]
  },
  {
    section: 'CRM',
    items: [
      { key: 'operators', label: 'Operators', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      { key: 'contacts', label: 'Contacts', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg> },
      { key: 'activities', label: 'Activities', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.5 16z"/></svg> },
      { key: 'sales-logs', label: 'Sales Logs', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
      { key: 'msa', label: 'MSA Tracker', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
    ]
  },
  {
    section: 'Operations',
    items: [
      { key: 'rigs', label: 'Rigs', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
      { key: 'frac-sites', label: 'Frac Sites', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
      { key: 'job-sites', label: 'Job Sites', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
      { key: 'opportunities', label: 'Opportunities', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
    ]
  },
  {
    section: 'Analytics',
    items: [
      { key: 'market-share', label: 'Market Share', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg> },
      { key: 'revenue-calc', label: 'Revenue Calc', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
      { key: 'reports', label: 'Reports', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    ]
  },
  {
    section: 'Settings',
    items: [
      { key: 'company-settings', label: 'Company Settings', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
      { key: 'territories', label: 'Territories', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> },
    ]
  }
];

const pageTitles = {
  dashboard: 'Dashboard',
  operators: 'Operators',
  contacts: 'Contact Directory',
  'sales-logs': 'Sales Logs',
  msa: 'MSA Tracker',
  rigs: 'Rig Tracker',
  'frac-sites': 'Frac Sites',
  'job-sites': 'Job Sites',
  opportunities: 'Opportunities',
  activities: 'Activities',
  'market-share': 'Market Share',
  'revenue-calc': 'Revenue Calculator',
  reports: 'Reports',
  territories: 'Territories',
  'company-settings': 'Company Settings',
};

function TerritorySwitcher({ onNavigate }) {
  const { territories, activeTerritoryId, activeTerritory, setTerritory } = useTerritory();
  const [open, setOpen] = useState(false);

  if (territories.length === 0) return null;

  return (
    <div style={{ padding: '8px 16px 0' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', marginBottom: 5, textTransform: 'uppercase' }}>
        Territory Filter
      </div>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: 'white', fontSize: 12, textAlign: 'left' }}>
          {activeTerritory ? (
            <>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: activeTerritory.color, flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTerritory.name}</span>
            </>
          ) : (
            <>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)' }}>All Territories</span>
            </>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, opacity: 0.7 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', marginTop: 4, maxHeight: 280, overflowY: 'auto' }}>
            <div onClick={() => { setTerritory(null); setOpen(false); }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, background: activeTerritoryId === null ? 'var(--surface-2)' : 'transparent', fontWeight: activeTerritoryId === null ? 700 : 400, color: 'var(--text-primary)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} />
              All Territories
              {activeTerritoryId === null && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 10 }}>✓</span>}
            </div>
            {territories.map(t => (
              <div key={t.id} onClick={() => { setTerritory(t.id); setOpen(false); }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, background: activeTerritoryId === t.id ? 'var(--surface-2)' : 'transparent', color: 'var(--text-primary)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                {t.states && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{t.states}</span>}
                {activeTerritoryId === t.id && <span style={{ marginLeft: 4, color: 'var(--primary)', fontSize: 10, flexShrink: 0 }}>✓</span>}
              </div>
            ))}
            <div onClick={() => { setOpen(false); onNavigate('territories'); }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 11, color: 'var(--primary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
              Manage territories
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AppShell({ user, onLogout, onCompanyUpdate }) {
  const [page, setPage] = useState('dashboard');
  const { activeTerritoryId, activeTerritory } = useTerritory();
  const initials = user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const primaryColor = user.primary_color || '#1e3a5f';

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-bg', primaryColor);
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);
    const lighter = `rgb(${Math.min(r+40,255)}, ${Math.min(g+40,255)}, ${Math.min(b+40,255)})`;
    document.documentElement.style.setProperty('--sidebar-hover', lighter);
  }, [primaryColor]);

  const renderPage = () => {
    const territoryId = activeTerritoryId;
    switch (page) {
      case 'dashboard': return <Dashboard territoryId={territoryId} />;
      case 'operators': return <Operators territoryId={territoryId} />;
      case 'rigs': return <Rigs territoryId={territoryId} />;
      case 'frac-sites': return <FracSites territoryId={territoryId} />;
      case 'job-sites': return <JobSites territoryId={territoryId} />;
      case 'opportunities': return <Opportunities territoryId={territoryId} />;
      case 'sales-logs': return <SalesLogs territoryId={territoryId} />;
      case 'msa': return <MSATracker territoryId={territoryId} />;
      case 'contacts': return <Contacts territoryId={territoryId} />;
      case 'activities': return <Activities territoryId={territoryId} />;
      case 'market-share': return <MarketShare territoryId={territoryId} />;
      case 'revenue-calc': return <RevenueCalculator territoryId={territoryId} />;
      case 'reports': return <Reports territoryId={territoryId} />;
      case 'territories': return <Territories user={user} />;
      case 'company-settings': return <CompanySettings user={user} onCompanyUpdate={onCompanyUpdate} />;
      default: return <Dashboard />;
    }
  };

  const industryLabel = user.industry_focus || 'Oil & Gas Sales Platform';
  const tagline = user.tagline || industryLabel;

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ background: primaryColor }}>
        <div className="sidebar-logo" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 14, marginBottom: 4 }}>
          {user.logo_data ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={user.logo_data} alt="logo" style={{ height: 36, maxWidth: 120, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </div>
          ) : (
            <h1 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              {user.company_name || 'Territory CRM'}
            </h1>
          )}
          <span style={{ fontSize: 10, opacity: 0.6, marginTop: 3, display: 'block', lineHeight: 1.3 }}>{tagline}</span>
        </div>

        <div className="sidebar-company" style={{ padding: '8px 16px', marginBottom: 4 }}>
          <div style={{ fontSize: 10, marginBottom: 2, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signed in as</div>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'white' }}>{user.name}</div>
          <div style={{ fontSize: 10, marginTop: 1, opacity: 0.55, textTransform: 'capitalize' }}>{user.role} · {user.company_name}</div>
        </div>

        <TerritorySwitcher onNavigate={setPage} />

        {activeTerritory && (
          <div style={{ margin: '6px 16px 0', padding: '5px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: 5, borderLeft: `3px solid ${activeTerritory.color}`, fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
            Filtering: <strong style={{ color: 'white' }}>{activeTerritory.name}</strong>
          </div>
        )}

        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(item => (
                <button
                  key={item.key}
                  className={`nav-item ${page === item.key ? 'active' : ''}`}
                  onClick={() => setPage(item.key)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="name">{user.name}</div>
              <div className="role">{user.role}</div>
            </div>
            <button className="logout-btn" onClick={onLogout} title="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="topbar-title">{pageTitles[page] || page}</div>
            {activeTerritory && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', background: activeTerritory.color + '22', border: `1px solid ${activeTerritory.color}44`, borderRadius: 20, fontSize: 11, color: activeTerritory.color, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeTerritory.color }} />
                {activeTerritory.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        {renderPage()}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setHydrated(true); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(fresh => {
        if (fresh) {
          const updated = { ...(JSON.parse(localStorage.getItem('user')) || {}), ...fresh };
          localStorage.setItem('user', JSON.stringify(updated));
          setUser(updated);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeTerritoryId');
    setUser(null);
  };

  const handleCompanyUpdate = (updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  if (!hydrated) return null;
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <TerritoryProvider user={user}>
      <AppShell user={user} onLogout={handleLogout} onCompanyUpdate={handleCompanyUpdate} />
    </TerritoryProvider>
  );
}
