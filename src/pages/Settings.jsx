import React, { useState } from 'react';
import { ShieldCheck, Bell, Globe, Lock, Save } from 'lucide-react';

export function Settings() {
  const user = JSON.parse(localStorage.getItem('sety_admin_user') || '{}');
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const sections = [
    {
      icon: ShieldCheck, title: 'Admin Profile',
      fields: [
        { label: 'Full Name',     val: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—' },
        { label: 'Email Address', val: user.email || '—' },
        { label: 'Role',          val: 'Platform Administrator' },
      ]
    },
    {
      icon: Bell, title: 'Notifications',
      toggles: [
        { label: 'New business sign-ups',   sub: 'Alert when a new org registers', def: true  },
        { label: 'Suspension alerts',       sub: 'Alert on payment failures',      def: true  },
        { label: 'Weekly platform report',  sub: 'Summary email every Monday',     def: false },
      ]
    },
    {
      icon: Globe, title: 'Platform',
      fields: [
        { label: 'Backend URL', val: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1' },
        { label: 'Environment', val: import.meta.env.MODE || 'development' },
        { label: 'Version',     val: '1.0.0' },
      ]
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Platform admin configuration</p>
        </div>
        {saved && <span className="badge badge--active" style={{ padding: '6px 14px', fontSize: 13 }}>Saved ✓</span>}
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sections.map(sec => {
          const Ic = sec.icon;
          return (
            <div className="card" key={sec.title}>
              <div className="card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ic size={15} color="#5341C4" />
                  {sec.title}
                </div>
              </div>
              {sec.fields?.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #F4F4F8', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9597A6', minWidth: 130 }}>{f.label}</span>
                  <span style={{ fontSize: 13, color: '#1C1C2E' }}>{f.val}</span>
                </div>
              ))}
              {sec.toggles?.map(t => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #F4F4F8', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C2E' }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: '#9597A6' }}>{t.sub}</div>
                  </div>
                  <Toggle defaultOn={t.def} />
                </div>
              ))}
            </div>
          );
        })}

        {/* Security section */}
        <div className="card">
          <div className="card__head"><Lock size={15} color="#5341C4" style={{ marginRight: 8 }} /> Security</div>
          <div style={{ padding: '16px 18px', display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn--outline">Change Password</button>
            <button type="button" className="btn btn--outline">Manage API Keys</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn--primary"><Save size={14} /> Save Changes</button>
        </div>
      </form>
    </div>
  );
}

function Toggle({ defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button type="button" onClick={() => setOn(v => !v)}
      style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#5341C4' : '#E2E2EA', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
    </button>
  );
}
