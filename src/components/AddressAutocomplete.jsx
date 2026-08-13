import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader } from 'lucide-react';
import geocodingService from '../services/geocodingService';

// Plain-props address field with Google Places / Nominatim autocomplete —
// ported from estate's formik-based AddressAutocomplete, adapted to this
// app's controlled-value + onChange pattern (no formik here).
export function AddressAutocomplete({ address, onChange, countryCode, inputStyle, labelStyle }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClickOutside = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleQueryChange(e) {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.length < 3) { setSuggestions([]); return; }
      setLoading(true);
      try {
        const results = await geocodingService.searchAddress(value, countryCode);
        setSuggestions(results);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function selectSuggestion(s) {
    onChange({ ...address, ...s.address });
    setQuery(s.display_name);
    setOpen(false);
  }

  function setField(key, value) {
    onChange({ ...address, [key]: value });
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <label style={labelStyle}>Search Address</label>
      <div style={{ position: 'relative' }}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Start typing an address…"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <Loader size={14} style={{ position: 'absolute', right: 12, top: 10, animation: 'spin 0.8s linear infinite', color: '#9597A6' }} />
        )}
        {open && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: -6,
            background: '#fff', border: '1px solid #E5E5EA', borderRadius: 8,
            maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          }}>
            {suggestions.map(s => (
              <div
                key={s.id}
                onClick={() => selectSuggestion(s)}
                style={{ display: 'flex', gap: 8, padding: '9px 12px', fontSize: 12.5, cursor: 'pointer', borderBottom: '1px solid #F4F4F8' }}
              >
                <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: '#9597A6' }} />
                <span>{s.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div>
          <label style={labelStyle}>Street</label>
          <input style={inputStyle} type="text" value={address.street || ''} onChange={e => setField('street', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>City</label>
          <input style={inputStyle} type="text" value={address.city || ''} onChange={e => setField('city', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>State</label>
          <input style={inputStyle} type="text" value={address.state || ''} onChange={e => setField('state', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Country</label>
          <input style={inputStyle} type="text" value={address.country || ''} onChange={e => setField('country', e.target.value)} />
        </div>
      </div>
    </div>
  );
}
