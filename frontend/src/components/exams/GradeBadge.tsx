'use client';

import React from 'react';

/**
 * BFPS ERP - GradeBadge Component (Phase 4E)
 * Reusable badge with ICSE grade color coding:
 *   A1/A2 = green, B1/B2 = blue, C1/C2 = yellow, D = orange, E = red
 */

interface GradeBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
}

const gradeColors: Record<string, { bg: string; color: string }> = {
  A1: { bg: '#dcfce7', color: '#166534' },
  A2: { bg: '#d1fae5', color: '#065f46' },
  B1: { bg: '#dbeafe', color: '#1e40af' },
  B2: { bg: '#e0e7ff', color: '#3730a3' },
  C1: { bg: '#fef9c3', color: '#854d0e' },
  C2: { bg: '#fef3c7', color: '#92400e' },
  D:  { bg: '#ffedd5', color: '#c2410c' },
  E:  { bg: '#fef2f2', color: '#991b1b' },
};

const sizeMap = {
  sm: { padding: '2px 8px', fontSize: 10, borderRadius: 10 },
  md: { padding: '3px 12px', fontSize: 12, borderRadius: 12 },
  lg: { padding: '5px 16px', fontSize: 14, borderRadius: 14 },
};

export default function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const colors = gradeColors[grade] || { bg: '#f1f5f9', color: '#475569' };
  const dims = sizeMap[size];

  return (
    <span
      style={{
        display: 'inline-block',
        background: colors.bg,
        color: colors.color,
        padding: dims.padding,
        borderRadius: dims.borderRadius,
        fontSize: dims.fontSize,
        fontWeight: 700,
        letterSpacing: '0.5px',
        lineHeight: 1,
      }}
    >
      {grade}
    </span>
  );
}
