import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, DollarSign, TrendingUp, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import axios from 'axios';

function fmt(n) { return (n || 0).toLocaleString(); }
function fmtMoney(kobo) { return '₦' + Math.round((kobo || 0) / 100).toLocaleString('en-NG'); }
function relTime(iso) {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m/60)}h ago`;
  return `${Math.floor(m/1440)}d ago`;
}

const SUB_COLOR = { active: '--success', trial: '--info', past_due: '--warning', suspended: '--danger', inactive: '--ink' };
const statusBadge = s => `badge badge${SUB_COLOR[s] || '--inactive'}`;

export function Dashboard() {
  const navigate = useNavigate();
  const [stats,     setStats]     = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [suspended, setSuspended] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/admin/stats'),
      axios.get('/admin/organizations', { params: { limit: 8 } }),
    ]).then(([statsRes, orgRes]) => {
      const s    = statsRes.data;
      const orgs = orgRes.data.results || [];
      setStats({ total: s.total, active: s.active, trial: s.trial, past_due: s.past_due, suspended: s.suspended });
      setRecent(orgs);
      setSuspended(orgs.filter(o => !o.is_active || ['suspended','past_due'].includes(o.subscription?.status)).slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: 'Total Businesses', value: fmt(stats?.total),    icon: Building2,    color: '#5341C4', bg: '#F0EEFF' },
    { label: 'Active',           value: fmt(stats?.active),   icon: TrendingUp,   color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Trial',            value: fmt(stats?.trial),    icon: Clock,        color: '#2563EB', bg: '#DBEAFE' },
    { label: 'Issues',           value: fmt((stats?.past_due || 0) + (stats?.suspended || 0)), icon: AlertCircle, color: '#D97706', bg: '#FEF3C7' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Platform overview · all businesses</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map((k, i) => {
          const Ic = k.icon;
          return (
            <div className="kpi-card" key={i}>
              <div className="kpi-card__icon" style={{ background: k.bg, color: k.color }}>
                <Ic size={18} strokeWidth={2} />
              </div>
              <div>
                <div className="kpi-card__val">{loading ? '—' : k.value}</div>
                <div className="kpi-card__label">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Recent sign-ups */}
        <div className="card">
          <div className="card__head">
            <span>Recent Businesses</span>
            <button className="btn btn--ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}
              onClick={() => navigate('/businesses')}>
              View all <ChevronRight size={13} />
            </button>
          </div>
          {loading
            ? <div className="empty"><p>Loading…</p></div>
            : recent.length === 0
            ? <div className="empty"><Building2 size={28} /><p>No businesses yet</p></div>
            : recent.map(org => (
              <div className="tbl-row" key={org.organization_id} onClick={() => navigate(`/businesses/${org.organization_id}`)}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F0EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#5341C4' }}>
                    {(org.name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1C1C2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
                  <div style={{ fontSize: 11.5, color: '#9597A6' }}>{org.type?.replace(/_/g,' ') || '—'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={statusBadge(org.subscription?.status || (org.is_active ? 'active' : 'inactive'))}>
                    {org.subscription?.status || (org.is_active ? 'active' : 'inactive')}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#CACCD8' }}>{relTime(org.createdAt)}</span>
                  <ChevronRight size={14} color="#CACCD8" />
                </div>
              </div>
            ))
          }
        </div>

        {/* Attention needed */}
        <div className="card">
          <div className="card__head">
            <span style={{ color: '#D97706' }}>Needs Attention</span>
          </div>
          {loading ? <div className="empty" style={{ padding: 32 }}><p>Loading…</p></div>
          : suspended.length === 0
          ? <div className="empty" style={{ padding: 32 }}>
              <TrendingUp size={24} color="#16A34A" />
              <p style={{ color: '#16A34A' }}>All businesses healthy</p>
            </div>
          : suspended.map(org => (
            <div className="tbl-row" key={org.organization_id} style={{ padding: '10px 14px' }}
              onClick={() => navigate(`/businesses/${org.organization_id}`)}>
              <AlertCircle size={14} color="#D97706" style={{ marginRight: 10, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
                <div style={{ fontSize: 11.5, color: '#9597A6' }}>
                  {org.subscription?.status || (!org.is_active ? 'inactive' : '—')}
                </div>
              </div>
              <ChevronRight size={13} color="#CACCD8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
