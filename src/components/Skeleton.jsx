import React from 'react';

export function Skeleton({ width = '100%', height = 14, radius = 6, style }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

// One list row — avatar circle + two text lines + N trailing chips.
// Matches the row shape used across Businesses/Team/Spaces/Payments lists.
export function RowSkeleton({ chips = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 22px', borderBottom: '1px solid var(--ink-100)', gap: 12 }}>
      <Skeleton width={34} height={34} radius={9} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Skeleton width="38%" height={13} style={{ marginBottom: 6 }} />
        <Skeleton width="24%" height={11} />
      </div>
      {Array.from({ length: chips }).map((_, i) => (
        <Skeleton key={i} width={64} height={20} radius={99} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6, chips = 1 }) {
  return Array.from({ length: rows }).map((_, i) => <RowSkeleton key={i} chips={chips} />);
}

// Detail-info card — a label/value row repeated N times, matches the
// Business Info / Subscription card layout on the Overview tab.
export function InfoCardSkeleton({ rows = 5 }) {
  return (
    <div className="card">
      <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--ink-100)' }}>
        <Skeleton width={110} height={13} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid #F4F4F8', gap: 12 }}>
          <Skeleton width={72} height={11} />
          <Skeleton width="45%" height={13} />
        </div>
      ))}
    </div>
  );
}

// Full BusinessDetail page shape — header, tabs, two info cards.
export function BusinessDetailSkeleton() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <Skeleton width={32} height={32} radius={8} />
        <Skeleton width={42} height={42} radius={10} />
        <div style={{ flex: 1 }}>
          <Skeleton width={200} height={18} style={{ marginBottom: 8 }} />
          <Skeleton width={260} height={12} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 28, marginBottom: 20, borderBottom: '1px solid var(--ink-100)', paddingBottom: 14 }}>
        {[60, 55, 65, 75, 65].map((w, i) => <Skeleton key={i} width={w} height={13} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <InfoCardSkeleton rows={5} />
        <InfoCardSkeleton rows={5} />
      </div>
    </div>
  );
}
