'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Download, GraduationCap, CalendarCheck, BookOpen, IndianRupee, Trophy, ScrollText } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JourneyData = any;

export default function StudentJourneyPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [journey, setJourney] = useState<JourneyData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && id) {
      setLoading(true);
      api.get(`/students/${id}/journey`)
        .then((res) => setJourney(res.data?.data))
        .catch(() => setError('Failed to load journey data.'))
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, id, router]);

  const downloadPdf = async () => {
    try {
      const res = await api.get(`/students/${id}/journey/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Journey_${journey?.student?.admissionNo ?? id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Failed to generate PDF.');
    }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-muted-foreground">Loading session...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
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
        {/* Back + Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/students')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Students
          </Button>
          {journey && (
            <Button onClick={downloadPdf} className="gap-2 shadow-md">
              <Download className="h-4 w-4" /> Export Journey PDF
            </Button>
          )}
        </div>

        {loading && (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <span className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></span>
            <span className="text-muted-foreground font-medium">Loading academic journey...</span>
          </div>
        )}

        {error && <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200 text-sm">{error}</div>}

        {journey && (
          <>
            {/* Student Profile Card */}
            <Card className="border-t-4 border-t-primary shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ScrollText className="h-6 w-6 text-primary" />
                  Academic Journey — {journey.student.firstName} {journey.student.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Admission No:</span> <span className="font-semibold ml-1">{journey.student.admissionNo}</span></div>
                  <div><span className="text-muted-foreground">Class:</span> <span className="font-semibold ml-1">{journey.student.className} - {journey.student.section}</span></div>
                  <div><span className="text-muted-foreground">Roll No:</span> <span className="font-semibold ml-1">{journey.student.rollNo ?? 'N/A'}</span></div>
                  <div><span className="text-muted-foreground">DOB:</span> <span className="font-semibold ml-1">{journey.student.dateOfBirth}</span></div>
                  <div><span className="text-muted-foreground">Father:</span> <span className="font-semibold ml-1">{journey.student.fatherName}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-semibold ml-1">{journey.student.parentPhone}</span></div>
                  <div><span className="text-muted-foreground">Admission Date:</span> <span className="font-semibold ml-1">{journey.student.admissionDate}</span></div>
                  <div><span className="text-muted-foreground">Aadhaar:</span> <span className="font-semibold ml-1 font-mono">{journey.student.aadhaarMasked ?? 'Not provided'}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className={`font-semibold ml-1 ${journey.student.isActive ? 'text-green-600' : 'text-red-500'}`}>{journey.student.isActive ? 'Active' : 'Inactive'}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Summary */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-blue-600" /> Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {journey.attendanceSummary.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No attendance records recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {journey.attendanceSummary.map((a: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{a.academicYear}</TableCell>
                          <TableCell>{a.totalRecords}</TableCell>
                          <TableCell className="text-green-600 font-semibold">{a.present}</TableCell>
                          <TableCell className="text-red-500 font-semibold">{a.absent}</TableCell>
                          <TableCell>{a.late}</TableCell>
                          <TableCell>
                            <span className={`font-bold ${a.percentage >= 75 ? 'text-green-600' : 'text-red-500'}`}>
                              {a.percentage}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Exam Results */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-purple-600" /> Examination Results</CardTitle>
              </CardHeader>
              <CardContent>
                {journey.examResults.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No examination records yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Max</TableHead>
                        <TableHead>Obtained</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {journey.examResults.map((e: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.examName}</TableCell>
                          <TableCell>{e.subjectName}</TableCell>
                          <TableCell>{e.academicYear}</TableCell>
                          <TableCell>{e.maxMarks}</TableCell>
                          <TableCell className="font-semibold">{e.marksObtained}</TableCell>
                          <TableCell>{e.percentage}%</TableCell>
                          <TableCell>{e.grade ?? '-'}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${e.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {e.isPassed ? 'PASS' : 'FAIL'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Fee History */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><IndianRupee className="h-5 w-5 text-emerald-600" /> Fee Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {journey.feeHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No fee records yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {journey.feeHistory.map((f: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{f.receiptNo}</TableCell>
                          <TableCell>{f.feeType}</TableCell>
                          <TableCell>{f.academicYear}</TableCell>
                          <TableCell>₹{f.amount}</TableCell>
                          <TableCell className="font-semibold">₹{f.paidAmount}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${f.status === 'PAID' ? 'bg-green-100 text-green-700' : f.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {f.status}
                            </span>
                          </TableCell>
                          <TableCell>{f.paidAt ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Placeholder Sections */}
            <Card className="shadow-sm border-dashed">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground"><Trophy className="h-5 w-5" /> Coming Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Co-Curricular Activities, Awards, Student Leave Records, and Disciplinary Records will appear here once those modules are activated in future phases.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
