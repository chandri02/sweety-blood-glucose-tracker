import React from 'react';

export function Skeleton({ width = '100%', height = '20px', borderRadius = '6px', className = '' }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="summary-card skeleton-card-box" aria-hidden="true">
      <div className="skeleton-line skeleton-title-line" />
      <div className="skeleton-line skeleton-value-line" />
      <div className="skeleton-line skeleton-footer-line" />
    </div>
  );
}

export function SkeletonCardsGrid() {
  return (
    <div className="summary-cards-grid" aria-label="Loading summary metrics" aria-busy="true">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="dashboard-chart-section-card skeleton-chart-box" aria-busy="true" aria-label="Loading chart data">
      <div className="skeleton-toolbar">
        <div className="skeleton-line skeleton-btn" />
        <div className="skeleton-line skeleton-btn" />
      </div>
      <div className="skeleton-chart-canvas">
        <div className="skeleton-line skeleton-chart-line" />
        <div className="skeleton-line skeleton-chart-bars" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="skeleton-table-wrapper" aria-busy="true" aria-label="Loading data table">
      <div className="skeleton-table-header" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <div className="skeleton-line cell-w-1" />
          <div className="skeleton-line cell-w-2" />
          <div className="skeleton-line cell-w-3" />
          <div className="skeleton-line cell-w-4" />
        </div>
      ))}
    </div>
  );
}
