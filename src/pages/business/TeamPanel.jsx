import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, UserPlus, KeyRound, Trash2, PauseCircle, PlayCircle, Copy, Check, Search } from 'lucide-react';
import { labelStyle, inputStyle } from '../../styles/formStyles';
import { Pagination } from '../../components/Pagination';

const PAGE_SIZE = 20;

// Residential orgs don't have generic "staff" — just admins, security, and
// residents. Everyone else (offices, commercial, event venues) keeps staff.
const RESIDENTIAL_TYPES = new Set(['residential_estate', 'residential_building']);

const isResidential = (orgType) => RESIDENTIAL_TYPES.has(orgType);

const memberTypeOptions = (orgType) => [
  { value: 'admin', label: 'Admin' },
  ...(isResidential(orgType) ? [] : [{ value: 'staff', label: 'Staff' }]),
  { value: 'security', label: 'Security' },
  { value: 'user', label: isResidential(orgType) ? 'Resident' : 'Member' },
];

const defaultMemberType = (orgType) => (isResidential(orgType) ? 'security' : 'staff');

// A "space" is whatever sub-unit the org uses to classify people — department
// for staff, ward/post for security, house/unit number for residents.
const spaceLabel = (memberType, orgType) =>
  memberType === 'user' && isResidential(orgType) ? 'House / Unit Number' : 'Space';

const NEEDS_STAFF_ROLE = new Set(['staff', 'security']);

function InviteModal({ organizationId, orgType, spaces, onClose, onDone }) {
  const [emails, setEmails] = useState('');
  const [memberType, setMemberType] = useState(defaultMemberType(orgType));
  const [spaceId, setSpaceId] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const emailList = emails.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    if (!emailList.length) { setError('Enter at least one email'); return; }

    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post('/members/invite', {
        organization_id: organizationId,
        emails: emailList,
        member_type: memberType,
        space_id: spaceId || undefined,
        staff_role: NEEDS_STAFF_ROLE.has(memberType) && staffRole ? staffRole : undefined,
      });
      const parts = [];
      if (data.added?.length)          parts.push(`${data.added.length} added directly`);
      if (data.invited?.length)        parts.push(`${data.invited.length} invited`);
      if (data.already_members?.length) parts.push(`${data.already_members.length} already members`);
      if (data.errors?.length)         parts.push(`${data.errors.length} failed`);
      onDone(parts.join(', ') || 'Done');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite members');
    }
    setSubmitting(false);
  }

  return (
    <div className="overlay">
      <div className="dialog" style={{ maxWidth: 480 }}>
        <h3>Invite / Add Team Members</h3>
        <p>Emails already on Sety are added immediately. New emails get an invite to register and accept.</p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Emails (comma or newline separated)</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={emails}
            onChange={e => setEmails(e.target.value)}
            placeholder="guard1@example.com&#10;guard2@example.com"
            required
          />

          <label style={labelStyle}>Role</label>
          <select style={inputStyle} value={memberType} onChange={e => setMemberType(e.target.value)}>
            {memberTypeOptions(orgType).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <label style={labelStyle}>{spaceLabel(memberType, orgType)} (optional)</label>
          <select style={inputStyle} value={spaceId} onChange={e => setSpaceId(e.target.value)}>
            <option value="">Unassigned</option>
            {spaces.map(s => <option key={s.space_id} value={s.space_id}>{s.name}</option>)}
          </select>

          {NEEDS_STAFF_ROLE.has(memberType) && (
            <>
              <label style={labelStyle}>Staff Role / Title (optional)</label>
              <input style={inputStyle} type="text" value={staffRole} onChange={e => setStaffRole(e.target.value)} />
            </>
          )}

          {error && <p style={{ color: '#DC2626', fontSize: 12.5, marginBottom: 10 }}>{error}</p>}

          <div className="dialog__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Security only — every other role gets an email invite and creates their
// own account. Security guards often don't have (or shouldn't have to set
// up) an email, so this skips straight to a working login.
function RegisterDeviceModal({ organizationId, orgType, spaces, onClose, onDone }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone_number: '', password: '',
    space_id: '', staff_role: '', employee_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { user, generated_password }
  const [copied, setCopied] = useState(false);

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await axios.post('/members/create-account', {
        organization_id: organizationId,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || undefined,
        phone_number: form.phone_number || undefined,
        password: form.password || undefined,
        member_type: 'security',
        space_id: form.space_id || undefined,
        staff_role: form.staff_role || undefined,
        employee_id: form.employee_id || undefined,
      });
      if (data.generated_password) {
        setResult(data);
      } else {
        onDone('Device registered and added to security');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register device');
    }
    setSubmitting(false);
  }

  function copyPassword() {
    navigator.clipboard.writeText(result.generated_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="overlay">
        <div className="dialog" style={{ maxWidth: 420 }}>
          <h3>Device Registered</h3>
          <p>
            Share this password with {result.user.first_name} — it won't be shown again.
            Login is <strong>{result.user.email}</strong>.
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            padding: '10px 14px', background: '#F4F4F8', borderRadius: 8, marginBottom: 20,
          }}>
            <code style={{ fontSize: 14, fontWeight: 700 }}>{result.generated_password}</code>
            <button type="button" className="btn btn--outline" style={{ padding: '6px 10px' }} onClick={copyPassword}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="dialog__actions">
            <button className="btn btn--primary" onClick={() => onDone('Device registered and added to security')}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div className="dialog" style={{ maxWidth: 480, maxHeight: '88vh', overflowY: 'auto' }}>
        <h3>Register Device</h3>
        <p>For security who don't have — or shouldn't have to set up — their own email. Skips the invite step entirely; they can log in right away. Every other role gets invited by email and creates their own account.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input style={inputStyle} type="text" required value={form.first_name} onChange={e => setField('first_name', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input style={inputStyle} type="text" required value={form.last_name} onChange={e => setField('last_name', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Email (optional)</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input style={inputStyle} type="tel" value={form.phone_number} onChange={e => setField('phone_number', e.target.value)} />
            </div>
          </div>

          <label style={labelStyle}>Password (optional — auto-generated if left blank)</label>
          <input style={inputStyle} type="text" value={form.password} onChange={e => setField('password', e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{spaceLabel('security', orgType)} (optional)</label>
              <select style={inputStyle} value={form.space_id} onChange={e => setField('space_id', e.target.value)}>
                <option value="">Unassigned</option>
                {spaces.map(s => <option key={s.space_id} value={s.space_id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Employee ID (optional)</label>
              <input style={inputStyle} type="text" value={form.employee_id} onChange={e => setField('employee_id', e.target.value)} />
            </div>
          </div>

          <label style={labelStyle}>Title (optional — e.g. Gate Guard, Patrol)</label>
          <input style={inputStyle} type="text" value={form.staff_role} onChange={e => setField('staff_role', e.target.value)} />

          {error && <p style={{ color: '#DC2626', fontSize: 12.5, marginBottom: 10 }}>{error}</p>}

          <div className="dialog__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Registering…' : 'Register Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TeamPanel({ organizationId, orgType, spaces, onNotify }) {
  const [showInvite, setShowInvite] = useState(false);
  const [showRegisterDevice, setShowRegisterDevice] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]       = useState(0);
  const [search, setSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/admin/organizations/${organizationId}/members`, {
        params: { limit: PAGE_SIZE, page, search: debouncedSearch || undefined },
      });
      setMembers(res.data.members || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setMembers([]);
    }
    setLoading(false);
  }, [organizationId, page, debouncedSearch]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  async function assignSpace(membershipId, spaceId) {
    setBusyId(membershipId);
    try {
      await axios.patch(`/members/${membershipId}/update-details`, { primary_space_id: spaceId });
      onNotify('Space assignment updated', 'success');
      loadMembers();
    } catch (err) {
      onNotify(err.response?.data?.message || 'Failed to assign space', 'error');
    }
    setBusyId(null);
  }

  async function toggleSuspend(membershipId, isActive) {
    setBusyId(membershipId);
    try {
      await axios.post(`/members/${membershipId}/${isActive ? 'suspend' : 'reactivate'}`);
      onNotify(isActive ? 'Member suspended' : 'Member reactivated', 'success');
      loadMembers();
    } catch (err) {
      onNotify(err.response?.data?.message || 'Action failed', 'error');
    }
    setBusyId(null);
  }

  async function remove(membershipId) {
    if (!window.confirm('Remove this member from the organization?')) return;
    setBusyId(membershipId);
    try {
      await axios.delete(`/members/${membershipId}`);
      onNotify('Member removed', 'success');
      loadMembers();
    } catch (err) {
      onNotify(err.response?.data?.message || 'Failed to remove member', 'error');
    }
    setBusyId(null);
  }

  async function resendInvite(membershipId) {
    setBusyId(membershipId);
    try {
      await axios.post(`/members/${membershipId}/resend`);
      onNotify('Invite resent', 'success');
    } catch (err) {
      onNotify(err.response?.data?.message || 'Failed to resend invite', 'error');
    }
    setBusyId(null);
  }

  async function cancelInvite(membershipId) {
    if (!window.confirm('Cancel this pending invite?')) return;
    setBusyId(membershipId);
    try {
      await axios.post(`/members/${membershipId}/cancel`);
      onNotify('Invite cancelled', 'success');
      loadMembers();
    } catch (err) {
      onNotify(err.response?.data?.message || 'Failed to cancel invite', 'error');
    }
    setBusyId(null);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <Search size={14} />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

    <div className="card">
      <div className="card__head">
        <span>Team ({total})</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--outline" onClick={() => setShowRegisterDevice(true)}>
            <KeyRound size={14} /> Register Device
          </button>
          <button className="btn btn--primary" onClick={() => setShowInvite(true)}>
            <UserPlus size={14} /> Invite / Add
          </button>
        </div>
      </div>

      {loading
        ? <div className="empty" style={{ padding: 40 }}><p>Loading team…</p></div>
        : members.length === 0
        ? <div className="empty" style={{ padding: 40 }}><Users size={28} /><p>No members found</p></div>
        : members.map(m => {
          const membershipId = m.membership_id || m._id;
          const fullName = m.user
            ? `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim()
            : (m.invite_email || m.display_name || '');
          const email    = m.user?.email || m.invite_email || '—';
          const initials = fullName
            ? fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
            : (m.staff_role || m.role || '?')[0].toUpperCase();
          const roleBadge = m.role === 'admin' ? 'info'
            : m.role === 'security' ? 'warning'
            : m.role === 'manager' ? 'trial'
            : 'inactive';
          const isActive = m.status === 'active';
          const isPending = m.status === 'pending';
          const busy = busyId === membershipId;

          return (
            <div key={membershipId} style={{ display: 'flex', alignItems: 'center', padding: '12px 22px', borderBottom: '1px solid var(--ink-100)', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple-500)' }}>{initials}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fullName || <span style={{ color: 'var(--ink-400)', fontStyle: 'italic' }}>Pending invite</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 1 }}>
                  {email}
                  {m.staff_role && <span style={{ color: 'var(--ink-300)', marginLeft: 6 }}>· {m.staff_role}</span>}
                </div>
              </div>

              {m.employee_id && (
                <span style={{ fontSize: 11, color: 'var(--ink-400)', fontFamily: 'JetBrains Mono, monospace' }}>{m.employee_id}</span>
              )}

              {!isPending && (
                <select
                  value={m.primary_space_id || m.space_id || ''}
                  disabled={busy}
                  onChange={e => assignSpace(membershipId, e.target.value)}
                  style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E5EA', maxWidth: 130 }}
                >
                  <option value="">Unassigned</option>
                  {spaces.map(s => <option key={s.space_id} value={s.space_id}>{s.name}</option>)}
                </select>
              )}

              <span className={`badge badge--${roleBadge}`}>{m.role}</span>
              {m.is_supervisor && <span className="badge badge--success">Supervisor</span>}
              {isPending && <span className="badge badge--warning">Pending</span>}

              {isPending ? (
                <>
                  <button
                    className="btn btn--outline" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busy}
                    onClick={() => resendInvite(membershipId)}
                  >
                    Resend
                  </button>
                  <button
                    className="btn btn--outline" style={{ padding: '6px 8px' }} disabled={busy}
                    title="Cancel invite" onClick={() => cancelInvite(membershipId)}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn--outline" style={{ padding: '6px 8px' }} disabled={busy}
                    title={isActive ? 'Suspend' : 'Reactivate'}
                    onClick={() => toggleSuspend(membershipId, isActive)}
                  >
                    {isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                  </button>
                  <button
                    className="btn btn--outline" style={{ padding: '6px 8px' }} disabled={busy}
                    title="Remove" onClick={() => remove(membershipId)}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          );
        })
      }

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>

      {showInvite && (
        <InviteModal
          organizationId={organizationId}
          orgType={orgType}
          spaces={spaces}
          onClose={() => setShowInvite(false)}
          onDone={(msg) => { setShowInvite(false); onNotify(msg, 'success'); loadMembers(); }}
        />
      )}
      {showRegisterDevice && (
        <RegisterDeviceModal
          organizationId={organizationId}
          orgType={orgType}
          spaces={spaces}
          onClose={() => setShowRegisterDevice(false)}
          onDone={(msg) => { setShowRegisterDevice(false); onNotify(msg, 'success'); loadMembers(); }}
        />
      )}
    </>
  );
}
