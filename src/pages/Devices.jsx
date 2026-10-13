// src/pages/Devices.jsx
// Platform device inventory: register Checkpoint devices, issue tokens, assign them to a
// business + location, rotate tokens, disable or retire. Org-level management (enrolment,
// fingerprints, scans) happens in the business's own dashboard under Devices.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Fingerprint, Plus, Search, ChevronRight, Copy, Check, KeyRound, AlertTriangle, X, MapPin, Building2,
} from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { ListSkeleton } from '../components/Skeleton';
import { labelStyle, inputStyle } from '../styles/formStyles';

const PAGE_SIZE = 25;
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'active', label: 'Active' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'retired', label: 'Retired' },
];
const STATUS_BADGE = { active: 'badge--success', disabled: 'badge--danger', retired: 'badge--inactive' };
const DEVICE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

function timeAgo(iso) {
  if (!iso) return 'Never';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' });
}

function Toast({ msg, type, onClear }) {
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(onClear, 3500);
    return () => clearTimeout(t);
  }, [msg, onClear]);
  if (!msg) return null;
  return <div className={`toast toast--${type}`}>{msg}</div>;
}

// ── Organization + location picker ───────────────────────────────────────────

/** Searchable business picker; loads the chosen business's locations. */
function OrgLocationPicker({ orgId, orgName, locationId, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(async () => {
      try {
        const res = await axios.get('/admin/organizations', { params: { limit: 8, search: query.trim() || undefined } });
        setResults(res.data.results || []);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (!orgId) { setLocations([]); return; }
    axios.get(`/admin/organizations/${orgId}`)
      .then((res) => setLocations(res.data.organization?.locations || []))
      .catch(() => setLocations([]));
  }, [orgId]);

  return (
    <>
      <label style={labelStyle}>Business</label>
      {orgId ? (
        <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Building2 size={13} color="var(--ink-400)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{orgName || orgId}</span>
          </span>
          <button type="button" className="btn btn--outline" style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => onChange({ organization_id: null, organization_name: null, location_id: null })}>
            Change
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            style={inputStyle}
            placeholder="Search businesses… (leave empty to keep the device in stock)"
            value={query}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => setQuery(e.target.value)}
          />
          {open && results.length > 0 && (
            <div style={styles.dropdown}>
              {results.map((o) => (
                <button
                  key={o.organization_id}
                  type="button"
                  style={styles.option}
                  onMouseDown={() => { onChange({ organization_id: o.organization_id, organization_name: o.name, location_id: null }); setQuery(''); }}
                >
                  <strong style={{ fontSize: 13 }}>{o.name}</strong>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{o.email || o.organization_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {orgId && (
        <>
          <label style={labelStyle}>Location</label>
          <select style={inputStyle} value={locationId || ''} onChange={(e) => onChange({ location_id: e.target.value || null })}>
            <option value="">No specific location</option>
            {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
          </select>
          {locations.length === 0 && (
            <p style={styles.hint}>This business has no locations yet — they can add them in Settings → Organization, then place the device from their Devices page.</p>
          )}
        </>
      )}
    </>
  );
}

// ── Token reveal (shown once) ────────────────────────────────────────────────

function TokenReveal({ deviceId, token, onDone }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="overlay">
      <div className="dialog" style={{ maxWidth: 520 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><KeyRound size={16} /> Device token for {deviceId}</h3>
        <p>Copy it now — <strong>it will not be shown again</strong>. Flash it onto the device and send it only through a private channel (password manager, in person). If it’s lost, rotate it.</p>
        <div style={styles.tokenBox}>
          <code style={{ wordBreak: 'break-all', fontSize: 12.5 }}>{token}</code>
          <button type="button" className="btn btn--outline" onClick={copy} style={{ flexShrink: 0 }}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
        <p style={styles.hint}>The device sends it as <code>Authorization: Bearer &lt;token&gt;</code> together with its device ID.</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--primary" onClick={onDone}>I’ve saved the token</button>
        </div>
      </div>
    </div>
  );
}

// ── Register ─────────────────────────────────────────────────────────────────

function RegisterDeviceModal({ onClose, onRegistered }) {
  const [form, setForm] = useState({
    device_id: '', name: '', serial_number: '', organization_id: null, organization_name: null, location_id: null, debug: true,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const idValid = DEVICE_ID_RE.test(form.device_id.trim());

  async function submit(e) {
    e.preventDefault();
    if (!idValid) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post('/admin/devices', {
        device_id: form.device_id.trim(),
        name: form.name.trim() || undefined,
        serial_number: form.serial_number.trim() || undefined,
        organization_id: form.organization_id || null,
        location_id: form.location_id || null,
        settings: { debug_logging: form.debug },
      });
      onRegistered(data.device, data.device_token);
    } catch (err) {
      setError(errMsg(err, 'Could not register the device'));
    }
    setSubmitting(false);
  }

  return (
    <div className="overlay">
      <div className="dialog" style={{ maxWidth: 520, maxHeight: '88vh', overflowY: 'auto' }}>
        <h3>Register a device</h3>
        <p>Adds a Checkpoint to the platform and issues its secret token. Assign it to a business now, or leave it in stock and assign it later.</p>
        <form onSubmit={submit}>
          <label style={labelStyle}>Device ID</label>
          <input style={inputStyle} required autoFocus placeholder="e.g. MyDevice-A0CDCB" value={form.device_id} onChange={(e) => set({ device_id: e.target.value })} />
          {form.device_id && !idValid && <p style={{ ...styles.hint, color: '#DC2626' }}>Use the ID the device reports: 3–64 letters, digits, “-” or “_”.</p>}

          <label style={labelStyle}>Name (optional)</label>
          <input style={inputStyle} placeholder="e.g. Front gate" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} />

          <label style={labelStyle}>Serial number (optional)</label>
          <input style={inputStyle} value={form.serial_number} onChange={(e) => set({ serial_number: e.target.value })} maxLength={80} />

          <OrgLocationPicker orgId={form.organization_id} orgName={form.organization_name} locationId={form.location_id} onChange={set} />

          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, margin: '4px 0 14px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.debug} onChange={(e) => set({ debug: e.target.checked })} style={{ marginTop: 3 }} />
            <span>Record traffic for diagnostics <span style={{ color: 'var(--ink-400)' }}>— useful while installing; can be turned off later.</span></span>
          </label>

          {error && <p style={{ ...styles.hint, color: '#DC2626' }}>{error}</p>}
          <div className="dialog__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting || !idValid}>{submitting ? 'Registering…' : 'Register & get token'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Manage ───────────────────────────────────────────────────────────────────

function ManageDeviceModal({ device, onClose, onSaved, onToken, notify }) {
  const [form, setForm] = useState({
    name: device.name || '',
    organization_id: device.organization_id,
    organization_name: device.organization_name,
    location_id: device.location_id,
    status: device.status,
    debug: !!device.settings?.debug_logging,
  });
  const [saving, setSaving] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const orgChanging = (form.organization_id || null) !== (device.organization_id || null);
  const retiring = form.status === 'retired' && device.status !== 'retired';

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim() || null,
        status: form.status,
        settings: { debug_logging: form.debug },
        ...(orgChanging && { organization_id: form.organization_id || null }),
        ...(form.organization_id && { location_id: form.location_id || null }),
      };
      await axios.patch(`/admin/devices/${encodeURIComponent(device.device_id)}`, body);
      notify('Device updated');
      onSaved();
    } catch (err) {
      setError(errMsg(err, 'Could not update the device'));
    }
    setSaving(false);
  }

  async function rotate() {
    setSaving(true);
    try {
      const { data } = await axios.post(`/admin/devices/${encodeURIComponent(device.device_id)}/token`);
      onToken(device.device_id, data.device_token);
    } catch (err) {
      setError(errMsg(err, 'Could not rotate the token'));
      setConfirmRotate(false);
    }
    setSaving(false);
  }

  const hb = device.last_heartbeat || {};
  return (
    <div className="overlay">
      <div className="dialog" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 style={{ marginBottom: 2 }}>{device.name || device.device_id}</h3>
            <code style={{ fontSize: 12, color: 'var(--ink-400)' }}>{device.device_id}</code>
          </div>
          <button type="button" className="btn btn--outline" style={{ padding: 6 }} onClick={onClose} aria-label="Close"><X size={14} /></button>
        </div>

        <div style={styles.facts}>
          <div style={styles.fact}><span style={styles.factLabel}>Last seen</span><strong>{timeAgo(device.last_seen_at)}</strong></div>
          <div style={styles.fact}><span style={styles.factLabel}>Firmware</span><strong>{device.firmware_version || '—'}</strong></div>
          <div style={styles.fact}><span style={styles.factLabel}>Fingerprints</span><strong>{device.stats?.enrolled_fingerprints ?? 0}</strong></div>
          <div style={styles.fact}><span style={styles.factLabel}>Token</span><strong>{device.token_prefix ? `${device.token_prefix}…` : '—'}</strong></div>
          <div style={styles.fact}><span style={styles.factLabel}>Signal</span><strong>{hb.wifi_rssi != null ? `${hb.wifi_rssi} dBm` : '—'}</strong></div>
          <div style={styles.fact}><span style={styles.factLabel}>Pending cmds</span><strong>{device.stats?.pending_commands ?? 0}</strong></div>
        </div>

        <form onSubmit={save}>
          <label style={labelStyle}>Name</label>
          <input style={inputStyle} value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} />

          <OrgLocationPicker orgId={form.organization_id} orgName={form.organization_name} locationId={form.location_id} onChange={set} />

          {orgChanging && device.organization_id && (
            <div style={styles.warn}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>Moving the device ends all {device.stats?.enrolled_fingerprints || 0} fingerprint links for <strong>{device.organization_name || 'the current business'}</strong> and tells the device to delete every fingerprint on its next button press. Attendance history is kept.</span>
            </div>
          )}

          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="active">Active</option>
            <option value="disabled">Disabled — blocks the device (lost / stolen)</option>
            <option value="retired">Retired — removes it from its business</option>
          </select>
          {retiring && (
            <div style={styles.warn}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>Retiring unassigns the device and ends all its fingerprint links. It can no longer connect.</span>
            </div>
          )}

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, margin: '4px 0 16px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.debug} onChange={(e) => set({ debug: e.target.checked })} />
            Record traffic for diagnostics
          </label>

          {error && <p style={{ ...styles.hint, color: '#DC2626' }}>{error}</p>}

          <div className="dialog__actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn btn--danger" onClick={() => setConfirmRotate(true)} disabled={saving}>
              <KeyRound size={13} /> Rotate token
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </form>

        {confirmRotate && (
          <div className="overlay">
            <div className="dialog">
              <h3>Rotate token?</h3>
              <p>The current token stops working immediately. The device will fail to connect until the new token is flashed onto it.</p>
              <div className="dialog__actions">
                <button type="button" className="btn btn--outline" onClick={() => setConfirmRotate(false)}>Cancel</button>
                <button type="button" className="btn btn--danger" onClick={rotate} disabled={saving}>{saving ? 'Rotating…' : 'Rotate token'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Devices() {
  const [params, setParams] = useSearchParams();
  const orgFilter = params.get('org') || '';
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [managing, setManaging] = useState(null);
  const [token, setToken] = useState(null); // { deviceId, token }
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const notify = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debounced, filter, orgFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/devices', {
        params: {
          page, limit: PAGE_SIZE,
          search: debounced || undefined,
          organization_id: orgFilter || undefined,
          ...(filter === 'unassigned' ? { unassigned: true } : filter !== 'all' ? { status: filter } : {}),
        },
      });
      setDevices(res.data.devices || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      notify(errMsg(err, 'Could not load devices'), 'error');
    }
    setLoading(false);
  }, [page, debounced, filter, orgFilter, notify]);

  useEffect(() => { load(); }, [load]);

  const orgName = useMemo(() => devices.find((d) => d.organization_id === orgFilter)?.organization_name, [devices, orgFilter]);

  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} onClear={clearToast} />

      {showRegister && (
        <RegisterDeviceModal
          onClose={() => setShowRegister(false)}
          onRegistered={(device, deviceToken) => {
            setShowRegister(false);
            setToken({ deviceId: device.device_id, token: deviceToken });
            load();
          }}
        />
      )}
      {managing && (
        <ManageDeviceModal
          device={managing}
          notify={notify}
          onClose={() => setManaging(null)}
          onSaved={() => { setManaging(null); load(); }}
          onToken={(deviceId, deviceToken) => { setManaging(null); setToken({ deviceId, token: deviceToken }); load(); }}
        />
      )}
      {token && <TokenReveal deviceId={token.deviceId} token={token.token} onDone={() => setToken(null)} />}

      <div className="page-header">
        <div>
          <h1>Devices</h1>
          <p>{total} Checkpoint device{total === 1 ? '' : 's'}{orgFilter ? ` for ${orgName || 'this business'}` : ' on the platform'}</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowRegister(true)}>
          <Plus size={15} /> Register device
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <Search size={14} />
          <input placeholder="Search device ID, name or serial…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button key={f.key} className={`tab${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        {orgFilter && (
          <button className="btn btn--outline" onClick={() => setParams({})}><X size={13} /> Clear business filter</button>
        )}
      </div>

      <div className="card">
        <div className="card__head">
          <span>{devices.length} shown</span>
          <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>Click a device to assign or manage it</span>
        </div>

        <div style={th.head}>
          <span>Device</span>
          <span>Business</span>
          <span>Location</span>
          <span>Status</span>
          <span>Fingerprints</span>
          <span style={{ textAlign: 'right' }}>Last seen</span>
        </div>

        {loading ? (
          <ListSkeleton rows={6} chips={2} />
        ) : devices.length === 0 ? (
          <div className="empty">
            <Fingerprint size={28} />
            <p>{filter === 'all' && !debounced && !orgFilter ? 'No devices yet. Register the first Checkpoint to issue its token.' : 'No devices match your filters'}</p>
          </div>
        ) : devices.map((d) => (
          <div key={d.device_id} style={th.row} onClick={() => setManaging(d)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setManaging(d); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={styles.icon}><Fingerprint size={16} color="var(--purple-500)" /></div>
              <div style={{ minWidth: 0 }}>
                <div style={styles.ellipsisStrong}>{d.name || d.device_id}</div>
                <code style={{ fontSize: 11, color: 'var(--ink-400)' }}>{d.device_id}</code>
              </div>
            </div>
            <span style={styles.ellipsis}>
              {d.organization_name || <span className="badge badge--warning">In stock</span>}
            </span>
            <span style={{ ...styles.ellipsis, display: 'flex', alignItems: 'center', gap: 5 }}>
              {d.location_name ? <><MapPin size={11} color="var(--ink-300)" />{d.location_name}</> : '—'}
            </span>
            <span><span className={`badge ${STATUS_BADGE[d.status] || 'badge--inactive'}`}>{d.status}</span></span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{d.stats?.enrolled_fingerprints ?? 0}</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{timeAgo(d.last_seen_at)}</span>
              <ChevronRight size={14} color="var(--ink-200)" />
            </div>
          </div>
        ))}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}

// Grid: Device | Business | Location | Status | Fingerprints | Last seen
const COLS = '2fr 1.5fr 1.2fr 0.8fr 0.8fr 0.9fr';

const th = {
  head: {
    display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '10px 22px',
    background: 'var(--bg-50)', borderBottom: '1px solid var(--ink-100)',
    fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  row: {
    display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '13px 22px',
    borderBottom: '1px solid var(--ink-100)', alignItems: 'center', cursor: 'pointer',
  },
};

const styles = {
  icon: { width: 34, height: 34, borderRadius: 9, background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ellipsis: { fontSize: 12.5, color: 'var(--ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 },
  ellipsisStrong: { fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  hint: { fontSize: 12, color: 'var(--ink-400)', margin: '-4px 0 12px', lineHeight: 1.5 },
  warn: { display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8, background: '#FEF3C7', color: '#92400E', fontSize: 12.5, lineHeight: 1.5, margin: '0 0 12px' },
  tokenBox: { display: 'flex', gap: 10, alignItems: 'center', padding: 12, borderRadius: 10, background: 'var(--bg-50)', border: '1px solid var(--ink-100)', marginBottom: 12 },
  fact: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  factLabel: { fontSize: 10.5, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  facts: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: 12, margin: '14px 0 16px',
    borderRadius: 10, background: 'var(--bg-50)', fontSize: 12,
  },
  dropdown: {
    position: 'absolute', top: 40, left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid var(--ink-100)',
    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', maxHeight: 260, overflowY: 'auto',
  },
  option: {
    display: 'flex', flexDirection: 'column', gap: 1, width: '100%', textAlign: 'left', padding: '9px 12px',
    border: 0, background: 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--ink-100)',
  },
};
