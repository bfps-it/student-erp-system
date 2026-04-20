'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Phone } from 'lucide-react';

interface OverdueItem {
  feeType: string;
  amount: number;
  paidAmount: number;
  status: string;
}

interface DefaulterStudent {
  student: {
    id: number;
    admissionNo: string;
    firstName: string;
    lastName: string;
    parentPhone: string;
    section: string;
    class: { name: string };
  };
  totalDue: number;
  totalPaid: number;
  balance: number;
  overdueItems: OverdueItem[];
}

interface DefaulterListProps {
  defaulters: DefaulterStudent[];
  academicYear: string;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function DefaulterList({ defaulters, academicYear }: DefaulterListProps) {
  if (defaulters.length === 0) {
    return (
      <Card className="shadow-sm border-green-200 bg-green-50/30">
        <CardContent className="p-6 text-center">
          <p className="text-green-700 font-medium text-sm">
            ✓ No fee defaulters found for {academicYear}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalOutstanding = defaulters.reduce((sum, d) => sum + d.balance, 0);

  return (
    <Card className="shadow-sm border-red-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Fee Defaulters — {academicYear}
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
          <span>{defaulters.length} student(s)</span>
          <span>•</span>
          <span className="text-red-600 font-bold">Total Outstanding: {fmt(totalOutstanding)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/80">
              <TableRow>
                <TableHead>Adm No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="text-red-700">Balance</TableHead>
                <TableHead>Fee Types</TableHead>
                <TableHead>Parent Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaulters.map((d) => (
                <TableRow key={d.student.id} className="bg-red-50/30">
                  <TableCell className="font-mono text-xs text-primary">{d.student.admissionNo}</TableCell>
                  <TableCell className="font-medium">{d.student.firstName} {d.student.lastName}</TableCell>
                  <TableCell>{d.student.class.name}-{d.student.section}</TableCell>
                  <TableCell>{fmt(d.totalDue)}</TableCell>
                  <TableCell className="text-green-700">{fmt(d.totalPaid)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                      {fmt(d.balance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {d.overdueItems.map((item, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-700'
                              : item.status === 'PARTIAL'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {item.feeType}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`tel:${d.student.parentPhone}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {d.student.parentPhone}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
