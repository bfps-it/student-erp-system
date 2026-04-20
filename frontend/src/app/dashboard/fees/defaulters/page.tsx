'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DefaulterList } from '@/components/fees/DefaulterList';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, AlertTriangle } from 'lucide-react';

export default function FeeDefaultersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [classId, setClassId] = useState('');
  const [section, setSection] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [classes, setClasses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user) {
      api.get('/classes').then((res) => setClasses(res.data?.data || [])).catch(() => {});
    }
  }, [authLoading, user, router]);

  const fetchDefaulters = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ academicYear });
      if (classId) params.set('classId', classId);
      if (section) params.set('section', section);
      const res = await api.get(`/fees/defaulters?${params.toString()}`);
      setDefaulters(res.data?.data || []);
      setFetched(true);
    } catch {
      setError('Failed to fetch defaulter list.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-muted-foreground">Loading session...</div>;

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
          <AlertTriangle className="h-7 w-7 text-red-600" />
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Fee Defaulters</h1>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-lg">Filter Defaulters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Class (optional)</label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Section (optional)</label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D', 'E'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchDefaulters} disabled={loading} className="w-full font-semibold">
                  {loading ? 'Loading...' : 'Show Defaulters'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">{error}</div>}

        {fetched && (
          <DefaulterList defaulters={defaulters} academicYear={academicYear} />
        )}
      </main>
    </div>
  );
}
