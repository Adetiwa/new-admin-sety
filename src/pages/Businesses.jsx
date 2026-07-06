import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, ChevronRight, MapPin } from 'lucide-react';
import axios from 'axios';

const FILTERS = ['all', 'active', 'trial', 'past_due', 'suspended', 'pending'];

const STATUS_CLASS = {
  active:    'badge--success',
  trial:     'badge--trial',
  past_due:  'badge--past_due',
  suspended: 'badge--suspended',
  pending:   'badge--inactive',
  inactive:  'badge--inactive',
};

const TYPE_LABELS = {
  residential_estate:  'Residential Estate',
  residential_building:'Residential Building',
  commercial_building: 'Commercial Building',
  office_building:     'Office Building',
  event_venue:         'Event Venue',
  mixed_use:           'Mixed Use',
};

const fmtType   = t => TYPE_LABELS[t] || (t || '—').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const fmtDate   = iso => iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
const fmtPeriod = sub => {
  if (!sub) return '—';
  const d = sub.trial_ends_at || sub.current_period_end;
  if (!d) return sub.currency || '—';
  const label = sub.status === 'trial' ? 'Trial ends' : 'Renews';
  return `${label} ${fmtDate(d)}`;
};

const effectiveStatus = o =>
  o.subscription?.status || o.status || (o.is_active ? 'active' : 'inactive');

export function Businesses() {
  const navigate = useNavigate();
  const [orgs,    setOrgs]    = useState([]);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/organizations', { params: { limit: 500 } });
      setOrgs(res.data.results || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = orgs.filter(o => {
    const st = effectiveStatus(o);
    if (filter !== 'all' && st !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (o.name          || '').toLowerCase().includes(q) ||
             (o.email         || '').toLowerCase().includes(q) ||
             (o.organization_id|| '').toLowerCase().includes(q) ||
             (o.address?.city || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Status counts for filter tabs
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? orgs.length : orgs.filter(o => effectiveStatus(o) === f).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Businesses</h1>
          <p>{orgs.length} organisations on the platform</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <Search size={14} />
          <input
            placeholder="Search name, email, city or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div className="filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'past_due' ? 'Past due' : f.charAt(0).toUpperCase() + f.slice(1)}
              {counts[f] > 0 && (
                <span style={{
                  marginLeft: 5, fontSize: 10, fontWeight: 700,
                  background: filter === f ? 'rgba(80,70,214,0.15)' : 'var(--ink-100)',
                  color: filter === f ? 'var(--purple-500)' : 'var(--ink-500)',
                  padding: '1px 6px', borderRadius: 99,
                }}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <span>{displayed.length} businesses</span>
          <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>Click to view details</span>
        </div>

        {/* Table header */}
        <div style={th.head}>
          <span>Business</span>
          <span>Type</span>
          <span>Location</span>
          <span>Status</span>
          <span>Billing</span>
          <span style={{ textAlign: 'right' }}>Joined</span>
        </div>

        {loading
          ? <div className="empty"><p>Loading businesses…</p></div>
          : displayed.length === 0
          ? <div className="empty"><Building2 size={28} /><p>No businesses match your filters</p></div>
          : displayed.map(org => {
            const st  = effectiveStatus(org);
            const loc = [org.address?.city, org.address?.state].filter(Boolean).join(', ') || '—';
            return (
              <div
                key={org.organization_id}
                style={th.row}
                onClick={() => navigate(`/businesses/${org.organization_id}`)}
              >
                {/* Business name + email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'var(--purple-50)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--purple-500)' }}>
                      {(org.name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {org.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {org.email || '—'}
                    </div>
                  </div>
                </div>

                {/* Type */}
                <span style={{ fontSize: 12.5, color: 'var(--ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fmtType(org.type)}
                </span>

                {/* Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <MapPin size={11} color="var(--ink-300)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {loc}
                  </span>
                </div>

                {/* Status */}
                <span>
                  <span className={`badge ${STATUS_CLASS[st] || 'badge--inactive'}`}>{st}</span>
                </span>

                {/* Billing */}
                <span style={{ fontSize: 12, color: 'var(--ink-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fmtPeriod(org.subscription)}
                </span>

                {/* Joined */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                    {fmtDate(org.created_at)}
                  </span>
                  <ChevronRight size={14} color="var(--ink-200)" />
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// Grid: Business(2.2fr) | Type(1.1fr) | Location(1fr) | Status(0.8fr) | Billing(1.1fr) | Joined(0.9fr)
const COLS = '2.2fr 1.1fr 1fr 0.8fr 1.1fr 0.9fr';

const th = {
  head: {
    display: 'grid', gridTemplateColumns: COLS, gap: 8,
    padding: '10px 22px',
    background: 'var(--bg-50)', borderBottom: '1px solid var(--ink-100)',
    fontSize: 11, fontWeight: 700, color: 'var(--ink-400)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  row: {
    display: 'grid', gridTemplateColumns: COLS, gap: 8,
    padding: '13px 22px', borderBottom: '1px solid var(--ink-100)',
    alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s',
  },
};
