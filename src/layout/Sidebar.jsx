import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { LayoutDashboard, Building2, Settings, LogOut } from 'lucide-react';
import { actions } from '../app/modules/Auth/_redux/authRedux';
import './sidebar.scss';

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/businesses', label: 'Businesses', icon: Building2 },
];

const NAV_BOTTOM = [
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ mobileOpen, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(s => s.auth.user);

  const initials = (name) =>
    (name || 'A').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  function handleLogout() {
    dispatch(actions.logout());
    navigate('/login', { replace: true });
  }

  const displayName = user
    ? (user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin')
    : 'Admin';

  return (
    <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
      {/* Brand */}
      <div className="sb-brand">
        <img src="/logo-light.png" alt="Sety" className="sb-brand__logo" />
        <span className="sb-brand__divider" />
        <span className="sb-brand__product">admin</span>
      </div>

      {/* Main nav */}
      <div className="sb-section">
        <div className="sb-section__label">Platform</div>
        <nav className="sb-nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to}
              onClick={onClose}
              className={({ isActive }) => `sb-link${isActive ? ' sb-link--active' : ''}`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom nav */}
      <div className="sb-section">
        <div className="sb-section__label">Admin</div>
        <nav className="sb-nav">
          {NAV_BOTTOM.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to}
              onClick={onClose}
              className={({ isActive }) => `sb-link${isActive ? ' sb-link--active' : ''}`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User */}
      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-user__avatar">{initials(displayName)}</div>
          <div className="sb-user__info">
            <div className="sb-user__name">{displayName}</div>
            <div className="sb-user__role">{user?.email || 'Platform Admin'}</div>
          </div>
          <button className="sb-logout" onClick={handleLogout} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
