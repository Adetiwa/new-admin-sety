import React, { useState } from 'react';
import axios from 'axios';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

const TYPES = [
  { value: 'residential_estate',  label: 'Residential Estate' },
  { value: 'residential_building',label: 'Residential Building' },
  { value: 'commercial_building', label: 'Commercial Building' },
  { value: 'office_building',     label: 'Office Building' },
  { value: 'event_venue',         label: 'Event Venue' },
  { value: 'event_organizer',     label: 'Event Organizer' },
  { value: 'mixed_use',           label: 'Mixed Use' },
  { value: 'educational',         label: 'Educational' },
  { value: 'healthcare',          label: 'Healthcare' },
  { value: 'hospitality',         label: 'Hospitality' },
  { value: 'industrial',          label: 'Industrial' },
  { value: 'retail',              label: 'Retail' },
];

const labelStyle = {
  fontSize: 11.5, fontWeight: 700, color: '#9597A6', marginBottom: 4,
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
};
const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #E5E5EA',
  borderRadius: 8, marginBottom: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

const EMPTY = {
  name: '', type: 'residential_estate', email: '', phone_number: '',
  address: { street: '', city: '', state: '', country: '' },
  owner_email: '',
};

export function AddBusinessModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Platform-admin creation — never adds you as a member of the new org;
      // ownership goes entirely to owner_email (added immediately if they
      // already have an account, invited otherwise).
      const { data } = await axios.post('/admin/organizations', {
        name: form.name,
        type: form.type,
        email: form.email,
        phone_number: form.phone_number,
        address: form.address,
        owner_email: form.owner_email,
      });
      onCreated(data.organization);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create business');
    }
    setSubmitting(false);
  }

  return (
    <div className="overlay">
      <div className="dialog" style={{ maxWidth: 560, maxHeight: '88vh', overflowY: 'auto' }}>
        <h3>Add Business</h3>
        <p>Creates a new organization on the platform, owned by the email below — not your own account. If they already have a Sety account they get admin access immediately; otherwise they're invited and land in the org once they register.</p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Business Name</label>
          <input style={inputStyle} type="text" required value={form.name} onChange={e => setField('name', e.target.value)} />

          <label style={labelStyle}>Business Type</label>
          <select style={inputStyle} value={form.type} onChange={e => setField('type', e.target.value)}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Business Email</label>
              <input style={inputStyle} type="email" required value={form.email} onChange={e => setField('email', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input style={inputStyle} type="tel" required value={form.phone_number} onChange={e => setField('phone_number', e.target.value)} />
            </div>
          </div>

          <AddressAutocomplete
            address={form.address}
            onChange={address => setField('address', address)}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
          />

          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Owner Email</label>
            <input
              style={inputStyle}
              type="email"
              required
              placeholder="Who should actually own and manage this business"
              value={form.owner_email}
              onChange={e => setField('owner_email', e.target.value)}
            />
          </div>

          {error && <p style={{ color: 'var(--danger-text, #DC2626)', fontSize: 12.5, marginBottom: 10 }}>{error}</p>}

          <div className="dialog__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
