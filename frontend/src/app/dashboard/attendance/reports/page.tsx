'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ThresholdAlert } from '@/components/attendance/ThresholdAlert';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, Download, GraduationCap, FileSpreadsheet, FileText } from 'lucide-react';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AttendanceReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classId, setClassId] = useState('');
  const [section, setSection] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [classes, setClasses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user) {
      api.get('/classes').then((res) => setClasses(res.data?.data || [])).catch(() => {});
    }
  }, [authLoading, user, router]);

  const fetchReport = async () => {
    if (!classId || !section || !month || !year) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/attendance/monthly-report?classId=${classId}&section=${section}&month=${month}&year=${year}`);
      setReport(res.data?.data?.report || []);
    } catch {
      setError('Failed to fetch attendance report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'xlsx' | 'csv') => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/attendance/export/${format}?classId=${classId}&section=${section}&month=${month}&year=${year}`;
    window.open(url, '_blank');
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-muted-foreground">Loading session...</div>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const belowThreshold = report.filter((r: any) => r.belowThreshold);

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
          <BarChart3 className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Attendance Reports</h1>
        </div>

        {/* Selector Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Select Report Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D', 'E'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Month</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Year</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReport} disabled={!classId || !section || loading} className="w-full font-semibold">
                  {loading ? 'Loading...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">{error}</div>}

        {/* Threshold Alert */}
        {report.length > 0 && (
          <ThresholdAlert
            students={belowThreshold}
            threshold={75}
            month={Number(month)}
            year={Number(year)}
          />
        )}

        {/* Monthly Report Table */}
        {report.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Monthly Report — {monthNames[Number(month) - 1]} {year}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="gap-1 text-xs font-semibold">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')} className="gap-1 text-xs font-semibold">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-1 text-xs font-semibold">
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Adm No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-green-700">P</TableHead>
                    <TableHead className="text-red-700">A</TableHead>
                    <TableHead className="text-yellow-700">Late</TableHead>
                    <TableHead className="text-orange-700">HD</TableHead>
                    <TableHead className="text-blue-700">Ex</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {report.map((r: any) => (
                    <TableRow key={r.studentId} className={r.belowThreshold ? 'bg-red-50/60' : ''}>
                      <TableCell>{r.rollNo ?? '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.admissionNo}</TableCell>
                      <TableCell className="font-medium">{r.firstName} {r.lastName}</TableCell>
                      <TableCell>{r.totalRecords}</TableCell>
                      <TableCell className="text-green-700 font-medium">{r.present}</TableCell>
                      <TableCell className="text-red-700 font-medium">{r.absent}</TableCell>
                      <TableCell className="text-yellow-700 font-medium">{r.late}</TableCell>
                      <TableCell className="text-orange-700">{r.halfDay}</TableCell>
                      <TableCell className="text-blue-700">{r.excused}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          r.belowThreshold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {r.percentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
