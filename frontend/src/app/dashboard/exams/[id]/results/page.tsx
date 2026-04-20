'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import GradeBadge from '@/components/exams/GradeBadge';

interface ExamResult {
  id: number;
  marksObtained: number;
  grade: string;
  percentage: number;
  isPassed: boolean;
  rank: number | null;
  remarks: string | null;
  student: {
    id: number;
    admissionNo: string;
    firstName: string;
    lastName: string;
    rollNo: number | null;
  };
}

interface ExamData {
  id: number;
  name: string;
  examType: string;
  maxMarks: number;
  passingMarks: number;
  isResultPublished: boolean;
  academicYear: string;
  class: { name: string; section: string };
  subject: { name: string; code: string };
}

export default function ResultsPage() {
  const params = useParams();
  const examId = Number(params.id);

  const [exam, setExam] = useState<ExamData | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/exams/${examId}/results`);
      const data = res.data.data;
      setExam(data.exam);
      setResults(data.results || []);
      if (data.message) setMessage(data.message);
    } catch { /* empty */ }
    setLoading(false);
  }, [examId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api.post(`/exams/${examId}/publish`, { publish: true });
      fetchResults();
    } catch { /* empty */ }
    setPublishing(false);
  };

  const handleDownloadReport = (studentId: number) => {
    window.open(`/api/v1/exams/${examId}/report-card/${studentId}`, '_blank');
  };

  const handleDownloadRanklist = () => {
    // Generate CSV client-side
    const headers = ['Rank', 'Roll No', 'Name', 'Admission No', 'Marks', 'Grade', 'Percentage', 'Status'];
    const rows = results.map((r) => [
      r.rank ?? '-', r.student.rollNo ?? '-', `${r.student.firstName} ${r.student.lastName}`,
      r.student.admissionNo, r.marksObtained, r.grade, `${r.percentage}%`, r.isPassed ? 'PASS' : 'FAIL',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranklist_${exam?.name || examId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading results...</div>;

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a365d', margin: 0 }}>Exam Results</h1>
          {exam && (
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                {exam.name} ({exam.examType})
              </span>
              <span style={{ background: '#f0fdf4', color: '#166534', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                {exam.subject.name}
              </span>
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                {exam.class.name}-{exam.class.section}
              </span>
              <span style={{
                background: exam.isResultPublished ? '#dcfce7' : '#fef9c3',
                color: exam.isResultPublished ? '#166534' : '#854d0e',
                padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600
              }}>
                {exam.isResultPublished ? '✓ Published' : '⏳ Unpublished'}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {exam && !exam.isResultPublished && (
            <button onClick={handlePublish} disabled={publishing}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', opacity: publishing ? 0.6 : 1
              }}>
              {publishing ? 'Publishing...' : '✓ Publish Results'}
            </button>
          )}
          {results.length > 0 && (
            <button onClick={handleDownloadRanklist}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              📥 Download Ranklist
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{ background: '#fef9c3', color: '#854d0e', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 500 }}>
          {message}
        </div>
      )}

      {/* Results Table */}
      {results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>No results available.</div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1a365d', color: '#fff' }}>
                {['Rank', 'Roll No', 'Name', 'Adm No', 'Marks', '%', 'Grade', 'Status', 'Report Card'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={r.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: r.rank === 1 ? '#d97706' : '#1a365d', fontSize: r.rank === 1 ? 16 : 13 }}>
                    {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank ?? '-'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{r.student.rollNo ?? '-'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.student.firstName} {r.student.lastName}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.student.admissionNo}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {r.marksObtained} / {exam?.maxMarks}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{r.percentage}%</td>
                  <td style={{ padding: '10px 14px' }}>
                    <GradeBadge grade={r.grade} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: r.isPassed ? '#dcfce7' : '#fef2f2',
                      color: r.isPassed ? '#166534' : '#991b1b',
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600
                    }}>
                      {r.isPassed ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => handleDownloadReport(r.student.id)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500, fontSize: 12 }}>
                      📄 Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {results.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginTop: 24 }}>
          <StatCard label="Total Students" value={String(results.length)} color="#2563eb" bg="#dbeafe" />
          <StatCard label="Passed" value={String(results.filter((r) => r.isPassed).length)} color="#16a34a" bg="#dcfce7" />
          <StatCard label="Failed" value={String(results.filter((r) => !r.isPassed).length)} color="#dc2626" bg="#fef2f2" />
          <StatCard
            label="Highest"
            value={String(Math.max(...results.map((r) => r.marksObtained)))}
            color="#7c3aed" bg="#ede9fe"
          />
          <StatCard
            label="Average"
            value={(results.reduce((a, r) => a + r.marksObtained, 0) / results.length).toFixed(1)}
            color="#0891b2" bg="#cffafe"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
    </div>
  );
}
