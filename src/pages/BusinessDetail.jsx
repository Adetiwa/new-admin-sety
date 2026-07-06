import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, CreditCard, BarChart2,
  CheckCircle, XCircle, AlertTriangle, Trash2, RefreshCcw,
  Mail, Phone, Globe, Calendar, ChevronRight,
} from 'lucide-react';
import axios from 'axios';

const badge = s => {
  const map = { active: 'success', trial: 'info', past_due: 'warning', suspended: 'danger' };
  return `badge badge--${map[s] || 'inactive'}`;
};

function Toast({ msg, type, onClear }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClear, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return <div className={`toast toast--${type}`}>{msg}</div>;
}

function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel, loading }) {
  return (
    <div className="overlay">
      <div className="dialog">
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="dialog__actions">
          <button className="btn btn--outline" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BusinessDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [tab, setTab]     = useState('overview');
  const [org, setOrg]     = useState(null);
  const [members, setMembers]   = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(false);
  const [confirm, setConfirm]   = useState(null); // { type, title, body, confirmLabel, danger }
  const [toast, setToast]       = useState({ msg: '', type: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgRes, memRes] = await Promise.all([
        axios.get(`/admin/organizations/${id}`),
        axios.get(`/admin/organizations/${id}/members`).catch(() => ({ data: { members: [] } })),
      ]);
      setOrg(orgRes.data.organization || orgRes.data);
      setMembers(memRes.data.members || memRes.data.results || []);
      axios.get(`/admin/organizations/${id}/invoices`).then(r => {
        setInvoices(r.data.invoices || r.data.results || []);
      }).catch(() => {});
    } catch { navigate('/businesses'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function doAction(type) {
    setActing(true);
    try {
      if (type === 'suspend') {
        await axios.patch(`/admin/organizations/${id}`, { is_active: false });
      } else if (type === 'activate') {
        await axios.patch(`/admin/organizations/${id}`, { is_active: true });
      } else if (type === 'clear_invoice') {
        await axios.post(`/admin/organizations/${id}/payments/offline`, { amount: 0, note: 'Admin cleared' });
      }
      setToast({ msg: 'Action completed successfully', type: 'success' });
      load();
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Action failed', type: 'error' });
    }
    setActing(false);
    setConfirm(null);
  }

  if (loading) return <div className="empty" style={{ minHeight: '60vh' }}><p>Loading business…</p></div>;
  if (!org) return null;

  const subStatus = org.subscription?.status || (org.is_active ? 'active' : 'inactive');
  const isSuspended = subStatus === 'suspended' || !org.is_active;

  const tabs = [
    { key: 'overview',  label: 'Overview'  },
    { key: 'team',      label: 'Team'      },
    { key: 'payments',  label: 'Payments'  },
    { key: 'actions',   label: 'Actions'   },
  ];

  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} onClear={() => setToast({ msg: '', type: 'success' })} />
      {confirm && (
        <ConfirmDialog
          {...confirm}
          loading={acting}
          onConfirm={() => doAction(confirm.type)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button className="btn btn--outline" style={{ padding: 8 }} onClick={() => navigate('/businesses')}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F0EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#5341C4' }}>{(org.name || '?')[0].toUpperCase()}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{org.name}</h1>
            <span className={badge(subStatus)}>{subStatus}</span>
          </div>
          <p style={{ fontSize: 13, color: '#9597A6', margin: 0 }}>
            {org.type?.replace(/_/g,' ')} · ID: {org.organization_id}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`detail-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card__head">Business Info</div>
            {[
              { icon: Building2, label: 'Name',    val: org.name },
              { icon: Mail,      label: 'Email',   val: org.email || org.contact_email || '—' },
              { icon: Phone,     label: 'Phone',   val: org.phone || '—' },
              { icon: Globe,     label: 'Country', val: org.country || '—' },
              { icon: Calendar,  label: 'Joined',  val: org.createdAt ? new Date(org.createdAt).toLocaleDateString('en-NG', { dateStyle: 'long' }) : '—' },
            ].map(({ icon: Ic, label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid #F4F4F8', gap: 12 }}>
                <Ic size={15} color="#9597A6" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9597A6', minWidth: 72 }}>{label}</span>
                <span style={{ fontSize: 13, color: '#1C1C2E' }}>{val}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card__head">Subscription</div>
            {[
              { label: 'Plan',       val: org.subscription?.plan_name || '—' },
              { label: 'Status',     val: <span className={badge(subStatus)}>{subStatus}</span> },
              { label: 'Billing',    val: org.subscription?.billing_cycle || '—' },
              { label: 'Renews',     val: org.subscription?.current_period_end ? new Date(org.subscription.current_period_end).toLocaleDateString('en-NG') : '—' },
              { label: 'Trial ends', val: org.subscription?.trial_ends_at ? new Date(org.subscription.trial_ends_at).toLocaleDateString('en-NG') : '—' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid #F4F4F8', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9597A6', minWidth: 80 }}>{label}</span>
                <span style={{ fontSize: 13, color: '#1C1C2E' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {tab === 'team' && (
        <div className="card">
          <div className="card__head"><span>Team ({members.length})</span></div>
          {members.length === 0
            ? <div className="empty" style={{ padding: 40 }}><Users size={28} /><p>No members found</p></div>
            : members.map(m => {
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
              return (
                <div key={m.membership_id || m._id} style={{ display: 'flex', alignItems: 'center', padding: '12px 22px', borderBottom: '1px solid var(--ink-100)', gap: 12 }}>
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
                      {m.space_name && <span style={{ color: 'var(--ink-300)', marginLeft: 6 }}>· {m.space_name}</span>}
                    </div>
                  </div>
                  {m.employee_id && (
                    <span style={{ fontSize: 11, color: 'var(--ink-400)', marginRight: 8, fontFamily: 'JetBrains Mono, monospace' }}>{m.employee_id}</span>
                  )}
                  <span className={`badge badge--${roleBadge}`}>{m.role}</span>
                  {m.is_supervisor && <span className="badge badge--success" style={{ marginLeft: 4 }}>Supervisor</span>}
                </div>
              );
            })
          }
        </div>
      )}

      {/* Payments */}
      {tab === 'payments' && (
        <div className="card">
          <div className="card__head">
            <span>Invoices ({invoices.length})</span>
          </div>

          {/* Table header */}
          <div style={inv_th.head}>
            <span>Invoice</span>
            <span>Description</span>
            <span>Period</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
            <span style={{ textAlign: 'center' }}>Attempts</span>
            <span style={{ textAlign: 'right' }}>Status</span>
          </div>

          {invoices.length === 0
            ? <div className="empty" style={{ padding: 40 }}><CreditCard size={28} /><p>No invoices found</p></div>
            : invoices.map(inv => {
              const fmtAmt = (kobo) => {
                const sym = inv.currency === 'NGN' ? '₦' : '$';
                return `${sym}${Math.round((kobo || 0) / 100).toLocaleString()}`;
              };
              const period = inv.period_start && inv.period_end
                ? `${new Date(inv.period_start).toLocaleDateString('en-NG', { day:'numeric', month:'short' })} – ${new Date(inv.period_end).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'2-digit' })}`
                : '—';
              const desc    = inv.line_items?.[0]?.description || '—';
              const failCnt = (inv.charge_attempts || []).filter(a => a.status === 'failed').length;
              const paidAt  = inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'2-digit' }) : null;
              const invBadge = inv.status === 'paid'    ? 'badge--success'
                             : inv.status === 'overdue' ? 'badge--suspended'
                             : inv.status === 'open'    ? 'badge--warning'
                             : 'badge--inactive';
              return (
                <div key={inv.invoice_id} style={inv_th.row}>
                  {/* Invoice # */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {inv.invoice_number || inv.invoice_id?.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'2-digit' }) : '—'}
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: 12.5, color: 'var(--ink-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {desc}
                  </div>

                  {/* Period */}
                  <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{period}</div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-900)' }}>{fmtAmt(inv.total)}</div>
                    {inv.amount_due > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 1 }}>
                        {fmtAmt(inv.amount_due)} due
                      </div>
                    )}
                    {paidAt && inv.status === 'paid' && (
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 1 }}>paid {paidAt}</div>
                    )}
                  </div>

                  {/* Charge attempts */}
                  <div style={{ textAlign: 'center' }}>
                    {failCnt > 0 ? (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--red)', background: '#FEE2E2', padding: '2px 8px', borderRadius: 99 }}>
                        {failCnt} failed
                      </span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--ink-300)' }}>—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${invBadge}`}>{inv.status}</span>
                    {inv.payment_method && (
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 3 }}>{inv.payment_method.replace(/_/g,' ')}</div>
                    )}
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* Actions */}
      {tab === 'actions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Suspend / Activate */}
          <div className="card">
            <div className="card__head">{isSuspended ? 'Activate Business' : 'Suspend Business'}</div>
            <div style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 13, color: '#7E8299', marginBottom: 16, lineHeight: 1.6 }}>
                {isSuspended
                  ? 'Re-activate this business to restore their access to the Sety platform.'
                  : 'Suspending will block all access for this business. Use with caution.'}
              </p>
              <button
                className={`btn ${isSuspended ? 'btn--success' : 'btn--danger'}`}
                onClick={() => setConfirm({
                  type: isSuspended ? 'activate' : 'suspend',
                  title: isSuspended ? 'Activate Business' : 'Suspend Business',
                  body: isSuspended
                    ? `Are you sure you want to activate ${org.name}?`
                    : `Are you sure you want to suspend ${org.name}? This will block all access immediately.`,
                  confirmLabel: isSuspended ? 'Yes, Activate' : 'Yes, Suspend',
                  danger: !isSuspended,
                })}
              >
                {isSuspended ? <CheckCircle size={15} /> : <XCircle size={15} />}
                {isSuspended ? 'Activate Business' : 'Suspend Business'}
              </button>
            </div>
          </div>

          {/* Clear invoice */}
          <div className="card">
            <div className="card__head">Clear Outstanding Invoice</div>
            <div style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 13, color: '#7E8299', marginBottom: 16, lineHeight: 1.6 }}>
                Mark any outstanding invoices as cleared for this business (e.g. payment received offline).
              </p>
              <button
                className="btn btn--outline"
                onClick={() => setConfirm({
                  type: 'clear_invoice',
                  title: 'Clear Invoice',
                  body: `This will mark all outstanding invoices as paid for ${org.name}.`,
                  confirmLabel: 'Clear Invoice',
                  danger: false,
                })}
              >
                <RefreshCcw size={15} /> Clear Invoice
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card" style={{ borderColor: '#FEE2E2', gridColumn: '1 / -1' }}>
            <div className="card__head" style={{ color: '#DC2626', borderBottomColor: '#FEE2E2' }}>
              <AlertTriangle size={14} style={{ marginRight: 6 }} />
              Danger Zone
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C2E' }}>Delete Organisation</div>
                <div style={{ fontSize: 12, color: '#9597A6', marginTop: 2 }}>Permanently remove this org from the platform. Cannot be undone.</div>
              </div>
              <button className="btn btn--danger" disabled>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Invoice table grid: #(1fr) | Description(2fr) | Period(1.4fr) | Amount(1fr) | Attempts(0.8fr) | Status(0.9fr)
const INV_COLS = '1fr 2fr 1.4fr 1fr 0.8fr 0.9fr';

const inv_th = {
  head: {
    display: 'grid', gridTemplateColumns: INV_COLS, gap: 8,
    padding: '9px 22px',
    background: 'var(--bg-50)', borderBottom: '1px solid var(--ink-100)',
    fontSize: 10.5, fontWeight: 700, color: 'var(--ink-400)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  row: {
    display: 'grid', gridTemplateColumns: INV_COLS, gap: 8,
    padding: '12px 22px', borderBottom: '1px solid var(--ink-100)',
    alignItems: 'center', transition: 'background 0.1s',
    ':hover': { background: 'var(--bg-50)' },
  },
};
