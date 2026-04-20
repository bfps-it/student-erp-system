'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED';

export interface StudentRecord {
  studentId: number;
  admissionNo: string;
  firstName: string;
  lastName: string;
  rollNo: number | null;
  status: AttendanceStatus;
  note: string;
}

interface AttendanceGridProps {
  records: StudentRecord[];
  onChange: (studentId: number, field: 'status' | 'note', value: string) => void;
  onMarkAllPresent: () => void;
  disabled?: boolean;
}

const statusColors: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-800 border-green-300',
  ABSENT: 'bg-red-100 text-red-800 border-red-300',
  LATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  HALF_DAY: 'bg-orange-100 text-orange-800 border-orange-300',
  EXCUSED: 'bg-blue-100 text-blue-800 border-blue-300',
};

export function AttendanceGrid({ records, onChange, onMarkAllPresent, disabled }: AttendanceGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground font-medium">
          {records.length} student(s) loaded
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onMarkAllPresent}
          disabled={disabled}
          className="font-semibold shadow-sm"
        >
          ✓ Mark All Present
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              <TableHead className="w-[60px]">Roll</TableHead>
              <TableHead className="w-[100px]">Adm No</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[200px]">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((rec) => (
              <TableRow key={rec.studentId} className="transition-colors">
                <TableCell className="font-medium text-muted-foreground">{rec.rollNo ?? '-'}</TableCell>
                <TableCell className="font-mono text-xs text-primary">{rec.admissionNo}</TableCell>
                <TableCell className="font-medium">{rec.firstName} {rec.lastName}</TableCell>
                <TableCell>
                  <Select
                    value={rec.status}
                    onValueChange={(val) => onChange(rec.studentId, 'status', val)}
                    disabled={disabled}
                  >
                    <SelectTrigger className={`h-8 text-xs font-semibold border ${statusColors[rec.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENT">✓ Present</SelectItem>
                      <SelectItem value="ABSENT">✗ Absent</SelectItem>
                      <SelectItem value="LATE">⏱ Late</SelectItem>
                      <SelectItem value="HALF_DAY">½ Half Day</SelectItem>
                      <SelectItem value="EXCUSED">📋 Excused</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <input
                    type="text"
                    placeholder="Optional note..."
                    value={rec.note}
                    onChange={(e) => onChange(rec.studentId, 'note', e.target.value)}
                    disabled={disabled}
                    className="w-full text-xs px-2 py-1 border rounded bg-white focus:ring-1 focus:ring-primary/30 outline-none disabled:opacity-50"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
