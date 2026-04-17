import React, { useState } from 'react';
import { api } from '../api/client.js';

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [regCompany, setRegCompany] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.auth.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters');
      return;
    }
    setRegLoading(true);
    setRegError('');
    try {
      const data = await api.auth.register({
        company_name: regCompany,
        name: regName,
        email: regEmail,
        password: regPassword,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const demoLogin = (e, em, pw) => {
    e.preventDefault();
    setEmail(em);
    setPassword(pw);
    setTab('signin');
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-logo">
          <h1>Territory CRM</h1>
          <p className="subtitle">Oil & Gas Sales Platform</p>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {[
            { key: 'signin', label: 'Sign In' },
            { key: 'register', label: 'Create Account' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(''); setRegError(''); }}
              style={{
                flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'signin' && (
          <>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', padding: '10px', fontSize: 14, justifyContent: 'center' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center' }}>
                Demo Account
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Admin', email: 'admin@demo.com', pw: 'admin123' },
                  { label: 'Sales', email: 'sales@demo.com', pw: 'sales123' },
                ].map(d => (
                  <button key={d.email} onClick={(e) => demoLogin(e, d.email, d.pw)}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--primary)' }}>{d.label}</strong> — {d.email}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'register' && (
          <>
            <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', marginBottom: 18, fontSize: 12, color: '#1d4ed8' }}>
              Create your company's private workspace. Your data is completely isolated from other companies.
            </div>
            {regError && <div className="error-msg">{regError}</div>}
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input className="form-control" placeholder="e.g. Acme Energy Services" value={regCompany}
                  onChange={e => setRegCompany(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Your Full Name *</label>
                <input className="form-control" placeholder="e.g. Jane Smith" value={regName}
                  onChange={e => setRegName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Work Email *</label>
                <input className="form-control" type="email" placeholder="you@company.com" value={regEmail}
                  onChange={e => setRegEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password * <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>(min 6 characters)</span></label>
                <input className="form-control" type="password" placeholder="••••••••" value={regPassword}
                  onChange={e => setRegPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input className="form-control" type="password" placeholder="••••••••" value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)} required />
              </div>
              <button className="btn btn-accent" type="submit" disabled={regLoading}
                style={{ width: '100%', padding: '10px', fontSize: 14, justifyContent: 'center' }}>
                {regLoading ? 'Creating account...' : 'Create Account & Get Started'}
              </button>
            </form>
            <p style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              You'll be the admin of your company workspace.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
