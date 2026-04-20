'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';

interface AlertStudent {
  studentId: number;
  admissionNo: string;
  firstName: string;
  lastName: string;
  rollNo: number | null;
  percentage: number;
  absent: number;
  totalRecords: number;
}

interface ThresholdAlertProps {
  students: AlertStudent[];
  threshold: number;
  month: number;
  year: number;
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ThresholdAlert({ students, threshold, month, year }: ThresholdAlertProps) {
  if (students.length === 0) {
    return (
      <Card className="shadow-sm border-green-200 bg-green-50/30">
        <CardContent className="p-6 text-center">
          <p className="text-green-700 font-medium text-sm">
            ✓ All students are above the {threshold}% attendance threshold for {monthNames[month - 1]} {year}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-red-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Below {threshold}% Attendance — {monthNames[month - 1]} {year}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{students.length} student(s) require attention</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll</TableHead>
              <TableHead>Adm No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Absent</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Attendance %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.studentId} className="bg-red-50/40">
                <TableCell>{s.rollNo ?? '-'}</TableCell>
                <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                <TableCell className="text-red-600 font-bold">{s.absent}</TableCell>
                <TableCell>{s.totalRecords}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    {s.percentage}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
