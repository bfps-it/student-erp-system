'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import GradeBadge from '@/components/exams/GradeBadge';

interface ExamInfo {
  id: number;
  name: string;
  examType: string;
  maxMarks: number;
  passingMarks: number;
  class: { name: string; section: string };
  subject: { name: string; code: string };
}

interface StudentRow {
  studentId: number;
  admissionNo: string;
  rollNo: number | null;
  name: string;
  marksObtained: string;
  grade: string;
  isPassed: boolean;
  saved: boolean;
}

function calculateGradeLocal(marks: number, maxMarks: number): { grade: string; isPassed: boolean } {
  const pct = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
  if (pct >= 90) return { grade: 'A1', isPassed: true };
  if (pct >= 80) return { grade: 'A2', isPassed: true };
  if (pct >= 70) return { grade: 'B1', isPassed: true };
  if (pct >= 60) return { grade: 'B2', isPassed: true };
  if (pct >= 50) return { grade: 'C1', isPassed: true };
  if (pct >= 40) return { grade: 'C2', isPassed: true };
  if (pct >= 33) return { grade: 'D', isPassed: true };
  return { grade: 'E', isPassed: false };
}

export default function MarksEntryPage() {
  const params = useParams();
  const examId = Number(params.id);

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchExamAndStudents = useCallback(async () => {
    try {
      // Fetch exam details from results (which includes exam info)
      const examRes = await api.get(`/exams?classId=&examType=&academicYear=`);
      const examData = (examRes.data.data || []).find((e: ExamInfo) => e.id === examId);
      if (examData) setExam(examData);

      // Fetch existing results
      const resultsRes = await api.get(`/exams/${examId}/results`);
      const existingResults = resultsRes.data.data?.results || [];

      // If results exist, populate from them
      if (existingResults.length > 0) {
        setStudents(existingResults.map((r: { student: { id: number; admissionNo: string; rollNo: number | null; firstName: string; lastName: string }; marksObtained: number; grade: string; isPassed: boolean }) => ({
          studentId: r.student.id,
          admissionNo: r.student.admissionNo,
          rollNo: r.student.rollNo,
          name: `${r.student.firstName} ${r.student.lastName}`,
          marksObtained: String(r.marksObtained),
          grade: r.grade,
          isPassed: r.isPassed,
          saved: true,
        })));
      }
    } catch { /* empty */ }
  }, [examId]);

  useEffect(() => { fetchExamAndStudents(); }, [fetchExamAndStudents]);

  const updateMarks = (idx: number, value: string) => {
    setStudents((prev) => {
      const copy = [...prev];
      const row = { ...copy[idx]! };
      row.marksObtained = value;
      row.saved = false;

      const marks = parseFloat(value);
      if (!isNaN(marks) && exam) {
        const result = calculateGradeLocal(marks, exam.maxMarks);
        row.grade = result.grade;
        row.isPassed = result.isPassed;
      } else {
        row.grade = '-';
        row.isPassed = false;
      }
      copy[idx] = row;
      return copy;
    });
  };

  const isMarksValid = (value: string): boolean => {
    const marks = parseFloat(value);
    if (isNaN(marks) || marks < 0) return false;
    if (exam && marks > exam.maxMarks) return false;
    return true;
  };

  const handleSave = async () => {
    if (!exam) return;
    setError('');
    setSuccessMsg('');

    // Validate all rows
    const invalid = students.filter((s) => !isMarksValid(s.marksObtained));
    if (invalid.length > 0) {
      setError(`Invalid marks for ${invalid.length} student(s). Marks must be 0-${exam.maxMarks}.`);
      return;
    }

    setSaving(true);
    try {
      await api.post(`/exams/${examId}/marks`, {
        results: students.map((s) => ({
          studentId: s.studentId,
          marksObtained: parseFloat(s.marksObtained),
        })),
      });
      setSuccessMsg(`Marks saved for ${students.length} students. Ranks calculated.`);
      setStudents((prev) => prev.map((s) => ({ ...s, saved: true })));
    } catch {
      setError('Failed to save marks. Try again.');
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a365d', margin: 0 }}>Marks Entry</h1>
        {exam && (
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              {exam.name}
            </span>
            <span style={{ background: '#f0fdf4', color: '#166534', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              {exam.subject.name} ({exam.subject.code})
            </span>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              {exam.class.name}-{exam.class.section}
            </span>
            <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              Max: {exam.maxMarks} | Pass: {exam.passingMarks}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#f0fdf4', color: '#166534', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
          {successMsg}
        </div>
      )}

      {/* Student Marks Table */}
      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          No students loaded. Marks can only be entered after results exist or students are linked to this exam.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a365d', color: '#fff' }}>
                  <th style={thStyle}>Roll No</th>
                  <th style={thStyle}>Admission No</th>
                  <th style={thStyle}>Student Name</th>
                  <th style={{ ...thStyle, width: 130 }}>Marks (0-{exam?.maxMarks})</th>
                  <th style={{ ...thStyle, width: 80 }}>Grade</th>
                  <th style={{ ...thStyle, width: 60 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const marks = parseFloat(s.marksObtained);
                  const invalid = !isMarksValid(s.marksObtained);

                  return (
                    <tr key={s.studentId} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}>{s.rollNo ?? '-'}</td>
                      <td style={tdStyle}>{s.admissionNo}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{s.name}</td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          min={0}
                          max={exam?.maxMarks}
                          value={s.marksObtained}
                          onChange={(e) => updateMarks(idx, e.target.value)}
                          style={{
                            width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 13,
                            border: invalid ? '2px solid #dc2626' : '1px solid #cbd5e1',
                            boxSizing: 'border-box',
                          }}
                        />
                        {invalid && !isNaN(marks) && (
                          <span style={{ color: '#dc2626', fontSize: 10, display: 'block', marginTop: 2 }}>
                            Exceeds max ({exam?.maxMarks})
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <GradeBadge grade={s.grade} />
                      </td>
                      <td style={tdStyle}>
                        {s.saved
                          ? <span style={{ color: '#16a34a', fontSize: 11 }}>✓</span>
                          : <span style={{ color: '#ca8a04', fontSize: 11 }}>●</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
            <button onClick={handleSave} disabled={saving}
              style={{
                padding: '12px 32px', borderRadius: 8, border: 'none',
                background: '#1a365d', color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
              {saving ? 'Saving...' : `Save All Marks (${students.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdStyle: React.CSSProperties = { padding: '10px 14px' };
