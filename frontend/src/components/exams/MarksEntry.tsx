'use client';

import React, { useState } from 'react';
import GradeBadge from './GradeBadge';

/**
 * BFPS ERP - MarksEntry Component (Phase 4E)
 * Reusable input with real-time grade preview.
 */

interface MarksEntryProps {
  maxMarks: number;
  initialValue?: number;
  onChange: (marks: number) => void;
  disabled?: boolean;
}

function calculateGradeLocal(marks: number, maxMarks: number): string {
  const pct = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
  if (pct >= 90) return 'A1';
  if (pct >= 80) return 'A2';
  if (pct >= 70) return 'B1';
  if (pct >= 60) return 'B2';
  if (pct >= 50) return 'C1';
  if (pct >= 40) return 'C2';
  if (pct >= 33) return 'D';
  return 'E';
}

export default function MarksEntry({ maxMarks, initialValue, onChange, disabled = false }: MarksEntryProps) {
  const [value, setValue] = useState(initialValue !== undefined ? String(initialValue) : '');
  const [error, setError] = useState('');

  const marks = parseFloat(value);
  const isValid = !isNaN(marks) && marks >= 0 && marks <= maxMarks;
  const grade = isValid ? calculateGradeLocal(marks, maxMarks) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);

    const m = parseFloat(v);
    if (isNaN(m)) {
      setError('Enter a number');
    } else if (m < 0) {
      setError('Min: 0');
    } else if (m > maxMarks) {
      setError(`Max: ${maxMarks}`);
    } else {
      setError('');
      onChange(m);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          min={0}
          max={maxMarks}
          step="0.5"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="0"
          style={{
            width: 90,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 13,
            border: error ? '2px solid #dc2626' : '1px solid #cbd5e1',
            textAlign: 'center',
            fontWeight: 600,
            opacity: disabled ? 0.5 : 1,
          }}
        />
        {error && (
          <span style={{
            position: 'absolute', left: 0, bottom: -14,
            color: '#dc2626', fontSize: 9, whiteSpace: 'nowrap'
          }}>
            {error}
          </span>
        )}
      </div>

      {grade && <GradeBadge grade={grade} size="sm" />}
    </div>
  );
}
