'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Exam {
  id: number;
  name: string;
  examType: string;
  examDate: string;
  maxMarks: number;
  passingMarks: number;
  venue: string | null;
  academicYear: string;
  isResultPublished: boolean;
  class: { name: string; section: string };
  subject: { name: string; code: string };
  _count: { results: number };
}

const EXAM_TYPES = ['UT', 'HY', 'ANNUAL', 'BOARD', 'MOCK', 'PRACTICAL'] as const;

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterClassId, setFilterClassId] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '', examType: 'UT', classId: '', subjectId: '', date: '',
    maxMarks: '100', passingMarks: '33', venue: '', academicYear: '2025-2026',
  });

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('examType', filterType);
      if (filterYear) params.set('academicYear', filterYear);
      if (filterClassId) params.set('classId', filterClassId);
      const res = await api.get(`/exams?${params.toString()}`);
      setExams(res.data.data || []);
    } catch { /* empty */ }
    setLoading(false);
  }, [filterType, filterYear, filterClassId]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/exams', {
        ...form,
        classId: parseInt(form.classId, 10),
        subjectId: parseInt(form.subjectId, 10),
        maxMarks: parseInt(form.maxMarks, 10),
        passingMarks: parseInt(form.passingMarks, 10),
      });
      setShowCreate(false);
      setForm({ name: '', examType: 'UT', classId: '', subjectId: '', date: '', maxMarks: '100', passingMarks: '33', venue: '', academicYear: '2025-2026' });
      fetchExams();
    } catch { /* empty */ }
    setCreating(false);
  };

  const getStatusBadge = (exam: Exam) => {
    if (exam.isResultPublished) return { label: 'Published', color: '#16a34a', bg: '#dcfce7' };
    if (exam._count.results > 0) return { label: 'Results Pending', color: '#ca8a04', bg: '#fef9c3' };
    return { label: 'Scheduled', color: '#2563eb', bg: '#dbeafe' };
  };

  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      UT: '#6366f1', HY: '#0891b2', ANNUAL: '#7c3aed',
      BOARD: '#dc2626', MOCK: '#ea580c', PRACTICAL: '#059669',
    };
    return map[type] || '#6b7280';
  };

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a365d', margin: 0 }}>Examinations</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Manage exams, marks entry, and results</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          background: '#1a365d', color: '#fff', padding: '10px 24px', border: 'none',
          borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer'
        }}>+ Create Exam</button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap',
        padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0'
      }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, minWidth: 140 }}>
          <option value="">All Types</option>
          {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input placeholder="Academic Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: 140 }} />
        <input placeholder="Class ID" value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: 100 }} />
      </div>

      {/* Exam Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading exams...</div>
      ) : exams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>No exams found.</div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1a365d', color: '#fff' }}>
                {['Exam', 'Type', 'Class', 'Subject', 'Date', 'Max', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exams.map((exam, idx) => {
                const badge = getStatusBadge(exam);
                return (
                  <tr key={exam.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>{exam.name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: getTypeColor(exam.examType), color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        {exam.examType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>{exam.class.name}-{exam.class.section}</td>
                    <td style={{ padding: '12px 14px' }}>{exam.subject.name}</td>
                    <td style={{ padding: '12px 14px' }}>{new Date(exam.examDate).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '12px 14px' }}>{exam.maxMarks}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
                      <Link href={`/dashboard/exams/${exam.id}/marks`}
                        style={{ color: '#2563eb', fontWeight: 500, fontSize: 12, textDecoration: 'none' }}>Marks</Link>
                      <Link href={`/dashboard/exams/${exam.id}/results`}
                        style={{ color: '#16a34a', fontWeight: 500, fontSize: 12, textDecoration: 'none' }}>Results</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a365d', margin: 0 }}>Create Exam</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Exam Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Exam Type *</label>
                  <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })} style={inputStyle}>
                    {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Class ID *</label>
                  <input type="number" required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Subject ID *</label>
                  <input type="number" required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Max Marks *</label>
                  <input type="number" required value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Passing Marks *</label>
                  <input type="number" required value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Venue</label>
                  <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Academic Year *</label>
                  <input required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setShowCreate(false)}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={creating}
                  style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#1a365d', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: creating ? 0.6 : 1 }}>
                  {creating ? 'Creating...' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' };
