'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttendanceGrid, type StudentRecord, type AttendanceStatus } from '@/components/attendance/AttendanceGrid';
import { useAuth } from '@/context/AuthContext';
import { CalendarCheck, GraduationCap, Save } from 'lucide-react';

export default function MarkAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Selectors state
  const [classId, setClassId] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [period, setPeriod] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [classes, setClasses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch classes on mount
  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user) {
      api.get('/classes').then((res) => setClasses(res.data?.data || [])).catch(() => {});
    }
  }, [authLoading, user, router]);

  // Fetch subjects when classId changes
  useEffect(() => {
    if (classId) {
      api.get(`/subjects?classId=${classId}`).then((res) => setSubjects(res.data?.data || [])).catch(() => {});
    }
  }, [classId]);

  // Load students for selected class/section
  const loadStudents = async () => {
    if (!classId || !section) return;
    setLoadingStudents(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.get(`/students?classId=${classId}&section=${section}&take=200`);
      const studentList = res.data?.data?.students || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: StudentRecord[] = studentList.map((s: any) => ({
        studentId: s.id,
        admissionNo: s.admissionNo,
        firstName: s.firstName,
        lastName: s.lastName,
        rollNo: s.rollNo,
        status: 'PRESENT' as AttendanceStatus,
        note: '',
      }));
      setStudents(mapped);
    } catch {
      setError('Failed to load students for this class/section.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleChange = (studentId: number, field: 'status' | 'note', value: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, [field]: value } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'PRESENT' as AttendanceStatus })));
  };

  const handleSubmit = async () => {
    if (!classId || !section || !date || !period || students.length === 0) return;
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        classId: Number(classId),
        section,
        date,
        period: Number(period),
        subjectId: subjectId ? Number(subjectId) : undefined,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          note: s.note || undefined,
        })),
      };
      const res = await api.post('/attendance/mark', payload);
      setResult(res.data?.data);
    } catch {
      setError('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-muted-foreground">Loading session...</div>;

  const isReadyToLoad = classId && section;
  const isReadyToSubmit = classId && section && date && period && students.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary shadow-md text-primary-foreground sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
              <GraduationCap className="h-6 w-6" />
              <span className="font-bold text-xl tracking-tight">BFPS ERP</span>
            </div>
            <span className="text-sm font-medium text-primary-foreground/90">{user.email}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Mark Attendance</h1>
        </div>

        {/* Selectors Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Select Class, Section, Date, Period & Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Class</label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Section</label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger><SelectValue placeholder="Sec" /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D', 'E'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Period</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subject</label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue placeholder="(Optional)" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadStudents} disabled={!isReadyToLoad || loadingStudents} className="w-full font-semibold">
                  {loadingStudents ? 'Loading...' : 'Load Students'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">{error}</div>}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded text-sm space-y-1">
            <p className="font-bold text-green-800">Attendance Saved Successfully</p>
            <p>Total: {result.total} | Created: {result.created} | Duplicates Skipped: {result.duplicatesSkipped}</p>
            {result.absentNotifications > 0 && (
              <p className="text-blue-700">📱 WhatsApp notifications sent to {result.absentNotifications} parent(s).</p>
            )}
          </div>
        )}

        {/* Attendance Grid */}
        {students.length > 0 && (
          <>
            <AttendanceGrid
              records={students}
              onChange={handleChange}
              onMarkAllPresent={handleMarkAllPresent}
              disabled={saving}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!isReadyToSubmit || saving}
                className="gap-2 px-8 shadow-md font-semibold"
                size="lg"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
