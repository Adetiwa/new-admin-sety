import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapPinned, Plus, Layers, Pencil, Trash2, Search } from 'lucide-react';
import { labelStyle, inputStyle } from '../../styles/formStyles';
import { Pagination } from '../../components/Pagination';

const PAGE_SIZE = 20;

const SPACE_TYPES = ['unit', 'house', 'office', 'department', 'ward', 'shop', 'other'];

function SpaceModal({ organizationId, space, onClose, onDone }) {
  const [form, setForm] = useState({
    name: space?.name || '',
    type: space?.type || 'unit',
    floor: space?.floor || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (space) {
        await axios.patch(`/organizations/${organizationId}/spaces/${space.space_id}`, form);
        onDone('Space updated');
      } else {
        await axios.post(`/organizations/${organizationId}/spaces`, form);
        onDone('Space created');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save space');
    }
    setSubmitting(false);
  }

  return (
    <div className="overlay">
      <div className="dialog" style={{ maxWidth: 420 }}>
        <h3>{space ? 'Edit Space' : 'Add Space'}</h3>
        <p>Spaces are the locations, units or departments within this business — a floor, a ward, an office, a shop.</p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Name</label>
          <input style={inputStyle} type="text" required value={form.name} onChange={e => setField('name', e.target.value)} />

          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={form.type} onChange={e => setField('type', e.target.value)}>
            {SPACE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>

          <label style={labelStyle}>Floor (optional)</label>
          <input style={inputStyle} type="text" value={form.floor} onChange={e => setField('floor', e.target.value)} />

          {error && <p style={{ color: '#DC2626', fontSize: 12.5, marginBottom: 10 }}>{error}</p>}

          <div className="dialog__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : space ? 'Save Changes' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkSpaceModal({ organizationId, onClose, onDone }) {
  const [names, setNames] = useState('');
  const [type, setType] = useState('unit');
  const [floor, setFloor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const nameList = names.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    if (!nameList.length) { setError('Enter at least one name'); return; }

    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post(`/organizations/${organizationId}/spaces/bulk`, {
        names: nameList,
        type,
        floor: floor || undefined,
      });
      const parts = [];
      if (data.created?.length) parts.push(`${data.created.length} created`);
      if (data.skipped?.length) parts.push(`${data.skipped.length} already existed`);
      onDone(parts.join(', ') || 'Done');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create spaces');
    }
    setSubmitting(false);
  }

  return (
    <div className="overlay">
      <div className="dialog" style={{ maxWidth: 480 }}>
        <h3>Bulk Add Spaces</h3>
        <p>One name per line (or comma-separated) — all created with the same type and floor. Names that already exist are skipped, not duplicated.</p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Names</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
            value={names}
            onChange={e => setNames(e.target.value)}
            placeholder={'Block A, Flat 1\nBlock A, Flat 2\nBlock A, Flat 3'}
            required
          />

          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
            {SPACE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>

          <label style={labelStyle}>Floor (optional)</label>
          <input style={inputStyle} type="text" value={floor} onChange={e => setFloor(e.target.value)} />

          {error && <p style={{ color: '#DC2626', fontSize: 12.5, marginBottom: 10 }}>{error}</p>}

          <div className="dialog__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Spaces'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SpacesPanel({ organizationId, onNotify }) {
  const [modalSpace, setModalSpace] = useState(undefined); // undefined = closed, null = new, object = editing
  const [showBulk, setShowBulk] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [spaces, setSpaces]     = useState([]);
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

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/organizations/${organizationId}/spaces`, {
        params: { limit: PAGE_SIZE, page, search: debouncedSearch || undefined },
      });
      setSpaces(res.data.results || []);
      setTotal(res.data.totalResults || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setSpaces([]);
    }
    setLoading(false);
  }, [organizationId, page, debouncedSearch]);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  async function handleDelete(space) {
    if (!window.confirm(`Delete "${space.name}"? Members assigned here will need reassigning.`)) return;
    setBusyId(space.space_id);
    try {
      await axios.delete(`/organizations/${organizationId}/spaces/${space.space_id}`);
      onNotify('Space deleted', 'success');
      loadSpaces();
    } catch (err) {
      onNotify(err.response?.data?.message || 'Failed to delete space', 'error');
    }
    setBusyId(null);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <Search size={14} />
          <input
            placeholder="Search spaces by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

    <div className="card">
      <div className="card__head">
        <span>Spaces ({total})</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--outline" onClick={() => setShowBulk(true)}>
            <Layers size={14} /> Bulk Add
          </button>
          <button className="btn btn--primary" onClick={() => setModalSpace(null)}>
            <Plus size={14} /> Add Space
          </button>
        </div>
      </div>

      {loading
        ? <div className="empty" style={{ padding: 40 }}><p>Loading spaces…</p></div>
        : spaces.length === 0
        ? <div className="empty" style={{ padding: 40 }}><MapPinned size={28} /><p>No spaces yet — add floors, units or departments here.</p></div>
        : spaces.map(s => (
          <div key={s.space_id} style={{ display: 'flex', alignItems: 'center', padding: '12px 22px', borderBottom: '1px solid var(--ink-100)', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPinned size={15} color="var(--purple-500)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 1 }}>
                {s.type}{s.floor ? ` · Floor ${s.floor}` : ''}
              </div>
            </div>
            <button className="btn btn--outline" style={{ padding: '6px 8px' }} disabled={busyId === s.space_id} title="Edit" onClick={() => setModalSpace(s)}>
              <Pencil size={14} />
            </button>
            <button className="btn btn--outline" style={{ padding: '6px 8px' }} disabled={busyId === s.space_id} title="Delete" onClick={() => handleDelete(s)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))
      }

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>

      {modalSpace !== undefined && (
        <SpaceModal
          organizationId={organizationId}
          space={modalSpace}
          onClose={() => setModalSpace(undefined)}
          onDone={(msg) => { setModalSpace(undefined); onNotify(msg, 'success'); loadSpaces(); }}
        />
      )}
      {showBulk && (
        <BulkSpaceModal
          organizationId={organizationId}
          onClose={() => setShowBulk(false)}
          onDone={(msg) => { setShowBulk(false); onNotify(msg, 'success'); loadSpaces(); }}
        />
      )}
    </>
  );
}
