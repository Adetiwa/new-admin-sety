import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, CreditCard, BarChart2,
  CheckCircle, XCircle, AlertTriangle, Trash2,
  Mail, Phone, Globe, Calendar, ChevronRight, Banknote, Tag, Gift,
} from 'lucide-react';
import axios from 'axios';
import { TeamPanel } from './business/TeamPanel';
import { SpacesPanel } from './business/SpacesPanel';
import { Pagination } from '../components/Pagination';

const badge = s => {
  const map = { active: 'success', trial: 'info', past_due: 'warning', suspended: 'danger' };
  return `badge badge--${map[s] || 'inactive'}`;
};

const labelStyle = {
  fontSize: 11.5, fontWeight: 700, color: '#9597A6', marginBottom: 4,
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
};
const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #E5E5EA',
  borderRadius: 8, marginBottom: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
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
  const [spaces, setSpaces]     = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(1);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(false);
  const [confirm, setConfirm]   = useState(null); // { type, title, body, confirmLabel, danger }
  const [toast, setToast]       = useState({ msg: '', type: 'success' });

  // Which inline billing form is expanded — 'payment' | 'pricing' | 'credit' | null
  const [activeForm, setActiveForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payForm, setPayForm] = useState({
    invoice_id: '', amount_paid: '', payment_reference: '', payment_method: 'bank_transfer', note: '',
  });
  const [pricingForm, setPricingForm] = useState({ custom_base_amount: '', custom_unit_price: '', note: '' });
  const [creditForm, setCreditForm] = useState({ amount: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const orgRes = await axios.get(`/admin/organizations/${id}`);
      setOrg(orgRes.data.organization || orgRes.data);
      axios.get(`/organizations/${id}/spaces`, { params: { limit: 200 } }).then(r => {
        setSpaces(r.data.results || []);
      }).catch(() => {});
    } catch { navigate('/businesses'); }
    setLoading(false);
  }, [id]);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await axios.get(`/admin/organizations/${id}/invoices`, {
        params: { page: invoicePage, limit: 20 },
      });
      setInvoices(res.data.invoices || res.data.results || []);
      setInvoiceTotal(res.data.total || 0);
      setInvoiceTotalPages(Math.ceil((res.data.total || 0) / (res.data.limit || 20)) || 1);
    } catch {}
  }, [id, invoicePage]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  useEffect(() => { load(); }, [load]);

  async function doAction(type) {
    setActing(true);
    try {
      if (type === 'suspend') {
        await axios.patch(`/admin/organizations/${id}`, { is_active: false });
      } else if (type === 'activate') {
        await axios.patch(`/admin/organizations/${id}`, { is_active: true });
      }
      setToast({ msg: 'Action completed successfully', type: 'success' });
      load();
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Action failed', type: 'error' });
    }
    setActing(false);
    setConfirm(null);
  }

  async function submitPayment(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`/billing/admin/organizations/${id}/payments/offline`, {
        invoice_id: payForm.invoice_id || undefined,
        amount_paid: Math.round(Number(payForm.amount_paid) * 100),
        payment_reference: payForm.payment_reference,
        payment_method: payForm.payment_method,
        note: payForm.note || undefined,
      });
      setToast({ msg: 'Payment recorded successfully', type: 'success' });
      setActiveForm(null);
      setPayForm({ invoice_id: '', amount_paid: '', payment_reference: '', payment_method: 'bank_transfer', note: '' });
      load();
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Failed to record payment', type: 'error' });
    }
    setSubmitting(false);
  }

  async function submitPricing(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { note: pricingForm.note || undefined };
      if (pricingForm.custom_base_amount !== '') body.custom_base_amount = Math.round(Number(pricingForm.custom_base_amount) * 100);
      if (pricingForm.custom_unit_price !== '') body.custom_unit_price = Math.round(Number(pricingForm.custom_unit_price) * 100);
      await axios.patch(`/billing/admin/organizations/${id}/subscription/pricing`, body);
      setToast({ msg: 'Custom pricing updated', type: 'success' });
      setActiveForm(null);
      setPricingForm({ custom_base_amount: '', custom_unit_price: '', note: '' });
      load();
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Failed to update pricing', type: 'error' });
    }
    setSubmitting(false);
  }

  async function submitCredit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`/billing/admin/organizations/${id}/subscription/credit`, {
        amount: Math.round(Number(creditForm.amount) * 100),
        reason: creditForm.reason,
      });
      setToast({ msg: 'Credit added successfully', type: 'success' });
      setActiveForm(null);
      setCreditForm({ amount: '', reason: '' });
      load();
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Failed to add credit', type: 'error' });
    }
    setSubmitting(false);
  }

  if (loading) return <div className="empty" style={{ minHeight: '60vh' }}><p>Loading business…</p></div>;
  if (!org) return null;

  const subStatus = org.subscription?.status || (org.is_active ? 'active' : 'inactive');
  const isSuspended = subStatus === 'suspended' || !org.is_active;

  const tabs = [
    { key: 'overview',  label: 'Overview'  },
    { key: 'team',      label: 'Team'      },
    { key: 'spaces',    label: 'Spaces'    },
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
        <TeamPanel
          organizationId={id}
          orgType={org.type}
          spaces={spaces}
          onNotify={(msg, type) => setToast({ msg, type })}
        />
      )}

      {/* Spaces */}
      {tab === 'spaces' && (
        <SpacesPanel
          organizationId={id}
          onNotify={(msg, type) => setToast({ msg, type })}
        />
      )}

      {/* Payments */}
      {tab === 'payments' && (
        <div className="card">
          <div className="card__head">
            <span>Invoices ({invoiceTotal})</span>
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

          <Pagination page={invoicePage} totalPages={invoiceTotalPages} total={invoiceTotal} onPageChange={setInvoicePage} />
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

          {/* Record offline payment */}
          <div className="card">
            <div className="card__head">Record Offline Payment</div>
            <div style={{ padding: '16px 18px' }}>
              {activeForm !== 'payment' ? (
                <>
                  <p style={{ fontSize: 13, color: '#7E8299', marginBottom: 16, lineHeight: 1.6 }}>
                    Log a payment received outside the platform (bank transfer, cash, etc.) against this business.
                  </p>
                  <button className="btn btn--outline" onClick={() => setActiveForm('payment')}>
                    <Banknote size={15} /> Record Payment
                  </button>
                </>
              ) : (
                <form onSubmit={submitPayment}>
                  <label style={labelStyle}>Amount Paid (₦)</label>
                  <input style={inputStyle} type="number" min="1" step="0.01" required
                    value={payForm.amount_paid}
                    onChange={e => setPayForm({ ...payForm, amount_paid: e.target.value })} />
                  <label style={labelStyle}>Payment Reference</label>
                  <input style={inputStyle} type="text" required
                    value={payForm.payment_reference}
                    onChange={e => setPayForm({ ...payForm, payment_reference: e.target.value })} />
                  <label style={labelStyle}>Payment Method</label>
                  <select style={inputStyle} value={payForm.payment_method}
                    onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                  <label style={labelStyle}>Invoice ID (optional)</label>
                  <input style={inputStyle} type="text"
                    value={payForm.invoice_id}
                    onChange={e => setPayForm({ ...payForm, invoice_id: e.target.value })} />
                  <label style={labelStyle}>Note (optional)</label>
                  <input style={inputStyle} type="text"
                    value={payForm.note}
                    onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn--outline" onClick={() => setActiveForm(null)}>Cancel</button>
                    <button type="submit" className="btn btn--primary" disabled={submitting}>
                      {submitting ? 'Saving…' : 'Save Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Set custom pricing */}
          <div className="card">
            <div className="card__head">Set Custom Pricing</div>
            <div style={{ padding: '16px 18px' }}>
              {activeForm !== 'pricing' ? (
                <>
                  <p style={{ fontSize: 13, color: '#7E8299', marginBottom: 16, lineHeight: 1.6 }}>
                    Override this business's plan pricing with a negotiated rate. Leave a field blank to keep the plan default.
                  </p>
                  <button className="btn btn--outline" onClick={() => setActiveForm('pricing')}>
                    <Tag size={15} /> Set Custom Pricing
                  </button>
                </>
              ) : (
                <form onSubmit={submitPricing}>
                  <label style={labelStyle}>Custom Base Amount (₦)</label>
                  <input style={inputStyle} type="number" min="0" step="0.01"
                    value={pricingForm.custom_base_amount}
                    onChange={e => setPricingForm({ ...pricingForm, custom_base_amount: e.target.value })} />
                  <label style={labelStyle}>Custom Unit Price (₦)</label>
                  <input style={inputStyle} type="number" min="0" step="0.01"
                    value={pricingForm.custom_unit_price}
                    onChange={e => setPricingForm({ ...pricingForm, custom_unit_price: e.target.value })} />
                  <label style={labelStyle}>Note</label>
                  <input style={inputStyle} type="text"
                    value={pricingForm.note}
                    onChange={e => setPricingForm({ ...pricingForm, note: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn--outline" onClick={() => setActiveForm(null)}>Cancel</button>
                    <button type="submit" className="btn btn--primary" disabled={submitting}>
                      {submitting ? 'Saving…' : 'Save Pricing'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Add manual credit */}
          <div className="card">
            <div className="card__head">Add Manual Credit</div>
            <div style={{ padding: '16px 18px' }}>
              {activeForm !== 'credit' ? (
                <>
                  <p style={{ fontSize: 13, color: '#7E8299', marginBottom: 16, lineHeight: 1.6 }}>
                    Apply a goodwill or adjustment credit to this business's subscription balance.
                  </p>
                  <button className="btn btn--outline" onClick={() => setActiveForm('credit')}>
                    <Gift size={15} /> Add Credit
                  </button>
                </>
              ) : (
                <form onSubmit={submitCredit}>
                  <label style={labelStyle}>Credit Amount (₦)</label>
                  <input style={inputStyle} type="number" min="1" step="0.01" required
                    value={creditForm.amount}
                    onChange={e => setCreditForm({ ...creditForm, amount: e.target.value })} />
                  <label style={labelStyle}>Reason</label>
                  <input style={inputStyle} type="text" required
                    value={creditForm.reason}
                    onChange={e => setCreditForm({ ...creditForm, reason: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn--outline" onClick={() => setActiveForm(null)}>Cancel</button>
                    <button type="submit" className="btn btn--primary" disabled={submitting}>
                      {submitting ? 'Saving…' : 'Add Credit'}
                    </button>
                  </div>
                </form>
              )}
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
