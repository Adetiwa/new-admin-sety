import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import './layout.scss';

export function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />
      {open && <div className="mobile-backdrop" onClick={() => setOpen(false)} />}
      <main className="app-main">
        <div className="mobile-topbar">
          <button className="mobile-topbar__toggle" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="mobile-topbar__logo">
            <img src="/logo-light.png" alt="Sety" className="mobile-topbar__logo-img" />
            <span className="mobile-topbar__divider" />
            <span className="mobile-topbar__product">admin</span>
          </div>
          <div className="mobile-topbar__spacer" />
        </div>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
