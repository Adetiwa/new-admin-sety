import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { actions } from '../app/modules/Auth/_redux/authRedux';
import './login.scss';

export function Login() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [email,    setEmail]   = useState('');
  const [password, setPass]    = useState('');
  const [show,     setShow]    = useState(false);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';
      const res  = await axios.post(`${BASE}/auth/login`, { email, password });
      const { user, tokens } = res.data;

      if (user.user_type !== 'super_admin') {
        setError('Access denied. This console is restricted to platform administrators.');
        return;
      }

      dispatch(actions.login(tokens.access.token, tokens.refresh.token));
      dispatch(actions.fulfillUser(user));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">

        {/* Left — brand panel */}
        <div className="auth-brand">
          <div className="auth-brand__logo">
            <img src="/logo-light.png" alt="Sety" style={{ height: 26, width: 'auto' }} />
            <span className="auth-brand__logo-sep" />
            <span className="auth-brand__logo-product">admin</span>
          </div>

          <div>
            <div className="auth-brand__badge">
              <svg width="8" height="8" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="4" fill="#22C55E" />
              </svg>
              Platform administration
            </div>
            <div className="auth-brand__quote">
              Manage businesses.<br />Monitor the platform.<br />Stay in control.
            </div>
            <p className="auth-brand__sub">
              Full visibility into every organization, subscription, and member on the Sety platform.
            </p>
          </div>

          <div className="auth-brand__footer">
            © {new Date().getFullYear()} Sety Technologies · Internal use only
          </div>

          {[180, 280, 380].map(d => (
            <div
              key={d}
              className="auth-ring"
              style={{ width: d, height: d, left: '100%', top: '100%', transform: 'translate(-50%, -50%)' }}
            />
          ))}
        </div>

        {/* Right — form */}
        <div className="auth-form-wrap">
          <div className="auth-form-head">
            <h1>Sign in</h1>
            <p>Access the Sety admin console</p>
          </div>

          {error && <div className="af-alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="af-field">
              <label>Email address</label>
              <input
                className="af-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@sety.io"
                required
              />
            </div>

            <div className="af-field">
              <label>Password</label>
              <div className="af-pw-wrap">
                <input
                  className="af-input"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button type="button" className="af-pw-toggle" onClick={() => setShow(v => !v)} tabIndex={-1}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="af-submit" disabled={loading}>
              {loading ? <><span className="af-spinner" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div className="auth-legal">
            Restricted to authorized Sety administrators only.<br />
            © {new Date().getFullYear()} Sety Technologies Ltd.
          </div>
        </div>
      </div>
    </div>
  );
}
