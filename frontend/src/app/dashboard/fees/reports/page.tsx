'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, BarChart3, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const statusColors: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
  WAIVED: 'bg-blue-100 text-blue-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

export default function FeeReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [classId, setClassId] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [classes, setClasses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user) {
      api.get('/classes').then((res) => setClasses(res.data?.data || [])).catch(() => {});
    }
  }, [authLoading, user, router]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (academicYear) params.set('academicYear', academicYear);
      if (status) params.set('status', status);
      if (month) params.set('month', month);
      if (year) params.set('year', year);
      if (classId) params.set('classId', classId);

      const res = await api.get(`/fees/report?${params.toString()}`);
      setReport(res.data?.data || null);
    } catch {
      setError('Failed to fetch fee report.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-muted-foreground">Loading session...</div>;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

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
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Fee Reports</h1>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-lg">Report Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Academic Year</label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['2024-2025', '2025-2026', '2026-2027'].map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    {['PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'WAIVED', 'REFUNDED'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Month</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Class</label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReport} disabled={loading} className="w-full font-semibold">
                  {loading ? 'Loading...' : 'Generate'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">{error}</div>}

        {/* Summary Cards */}
        {report && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="h-5 w-5 text-green-700" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Collected</p>
                  <p className="text-xl font-extrabold text-green-700">{fmt(report.totalCollected)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-red-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="h-5 w-5 text-red-700" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Pending</p>
                  <p className="text-xl font-extrabold text-red-700">{fmt(report.totalPending)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-blue-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><IndianRupee className="h-5 w-5 text-blue-700" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Records</p>
                  <p className="text-xl font-extrabold text-blue-700">{report.totalRecords}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Table */}
        {report && report.payments && report.payments.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Payment Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader className="bg-gray-50/80 sticky top-0">
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {report.payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-primary">{p.receiptNo}</TableCell>
                        <TableCell className="font-medium">{p.student?.firstName} {p.student?.lastName}</TableCell>
                        <TableCell>{p.student?.class?.name}-{p.student?.section}</TableCell>
                        <TableCell>{p.feeType}</TableCell>
                        <TableCell>{fmt(p.amount)}</TableCell>
                        <TableCell className="text-green-700 font-medium">{fmt(p.paidAmount)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{p.paymentMethod || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
