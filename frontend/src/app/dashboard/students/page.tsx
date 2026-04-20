'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { BulkImportModal } from '@/components/students/BulkImportModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FileBadge, Plus, GraduationCap, ScrollText } from 'lucide-react';

export default function StudentsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      // Depending on the exact pagination structure returning from backend
      // It might be res.data.data.students or res.data.data
      const studentData = res.data?.data?.students || res.data?.data || [];
      if (Array.isArray(studentData)) {
        setStudents(studentData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user) {
      fetchStudents();
    }
  }, [authLoading, user, router]);

  const downloadIdCard = async (id: number, admissionNo: string) => {
    try {
      const res = await api.get(`/students/${id}/id-card`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ID_Card_${admissionNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to generate ID card", err);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading session...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar Component (In future can be extracted to general layout) */}
      <header className="bg-primary shadow-md text-primary-foreground sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
              <GraduationCap className="h-6 w-6" />
              <span className="font-bold text-xl tracking-tight">BFPS ERP</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-primary-foreground/90">{user.email}</span>
              <Button variant="secondary" size="sm" onClick={() => logout(true)} className="font-medium px-4">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Student Directory</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage enrollments, IDs, and records seamlessly.</p>
          </div>
          <div className="flex gap-3">
            <BulkImportModal onSuccess={fetchStudents} />
            <Button className="shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </div>
        </div>

        {/* Core Table View */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
             <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2 font-medium">
                <span className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></span>
                <span>Fetching students...</span>
             </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-[120px]">Adm No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class/Section</TableHead>
                  <TableHead>Parent Phone</TableHead>
                  <TableHead>Aadhaar</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center bg-gray-50/20">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <GraduationCap className="h-10 w-10 mb-2 opacity-20" />
                        <p className="font-medium text-base">No students found</p>
                        <p className="text-sm">Import or add a new student manually.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((st) => (
                    <TableRow key={st.id} className="transition-colors hover:bg-gray-50/50">
                      <TableCell className="font-semibold text-primary">{st.admissionNo}</TableCell>
                      <TableCell className="font-medium">{st.firstName} {st.lastName}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {st.class?.name || `Class ${st.classId}`} - {st.section}
                        </span>
                      </TableCell>
                      <TableCell>{st.parentPhone}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{st.aadhaarMasked ?? '—'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => router.push(`/dashboard/students/${st.id}/journey`)}
                          className="hover:text-purple-600 hover:bg-purple-50 transition-all font-semibold text-sm"
                        >
                          <ScrollText className="mr-1 h-4 w-4" /> Journey
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadIdCard(st.id, st.admissionNo)}
                          className="hover:text-primary hover:bg-primary/10 transition-all font-semibold text-sm"
                        >
                          <FileBadge className="mr-1 h-4 w-4" /> ID Card
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
