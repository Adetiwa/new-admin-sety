import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, total, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 22px', borderTop: '1px solid var(--ink-100)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>
        {total != null ? `${total} total` : ''}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn--outline" style={{ padding: '6px 10px' }}
          disabled={page <= 1} onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--ink-700)', fontWeight: 600 }}>
          Page {page} of {totalPages}
        </span>
        <button
          className="btn btn--outline" style={{ padding: '6px 10px' }}
          disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
