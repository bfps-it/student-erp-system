import { Request, Response, NextFunction } from 'express';
import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';

import * as AttendanceService from '../services/attendance.service';
import type {
  MarkAttendanceInput,
  GetAttendanceByDateInput,
  MonthlyReportInput,
  ThresholdAlertInput,
} from '../validators/attendance.validator';

/**
 * BFPS ERP - Attendance Controller (Phase 4C)
 */

// ─── Mark Attendance (POST) ────────────────────────────────

export const markAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as MarkAttendanceInput;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markedBy = (req as any).user?.id ?? 0;
    const result = await AttendanceService.markAttendance(data, markedBy);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Get Attendance by Date (GET) ──────────────────────────

export const getAttendanceByDate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as GetAttendanceByDateInput;
    const records = await AttendanceService.getAttendanceByDate({
      classId: Number(params.classId),
      section: String(params.section),
      date: String(params.date),
      period: params.period ? Number(params.period) : undefined,
    });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

// ─── Monthly Report (GET) ──────────────────────────────────

export const getMonthlyReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as MonthlyReportInput;
    const report = await AttendanceService.getMonthlyReport({
      classId: Number(params.classId),
      section: String(params.section),
      month: Number(params.month),
      year: Number(params.year),
    });
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// ─── Threshold Alerts (GET) ────────────────────────────────

export const getThresholdAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as ThresholdAlertInput;
    const alerts = await AttendanceService.getThresholdAlerts({
      classId: params.classId ? Number(params.classId) : undefined,
      threshold: params.threshold ? Number(params.threshold) : 75,
      month: params.month ? Number(params.month) : undefined,
      year: params.year ? Number(params.year) : undefined,
    });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

// ─── Export Monthly Report as PDF ──────────────────────────

export const exportReportPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as MonthlyReportInput;
    const { report, month, year, classId, section } = await AttendanceService.getMonthlyReport({
      classId: Number(params.classId),
      section: String(params.section),
      month: Number(params.month),
      year: Number(params.year),
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const pageW = doc.page.width;
    const contentW = pageW - 100;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${classId}_${section}_${month}_${year}.pdf"`);
    doc.pipe(res);

    // Letterhead
    doc.rect(0, 0, pageW, 90).fill('#1a365d');
    doc.fill('#ffffff');
    doc.fontSize(16).font('Helvetica-Bold').text('BABA FARID PUBLIC SCHOOL', 50, 18, { align: 'center', width: contentW });
    doc.fontSize(8).font('Helvetica').text('Kilianwali, Sri Muktsar Sahib, Punjab | ICSE & ISC Board | PU170', 50, 38, { align: 'center', width: contentW });
    doc.fontSize(11).font('Helvetica-Bold').text(`Monthly Attendance Report — ${month}/${year}`, 50, 58, { align: 'center', width: contentW });

    doc.fill('#000000');
    let y = 105;
    doc.fontSize(9).font('Helvetica').text(`Class: ${classId} | Section: ${section} | Total Students: ${report.length}`, 50, y);
    y += 20;

    // Table header
    const cols = [50, 130, 230, 280, 320, 360, 400, 445, 490];
    const hdrs = ['Adm No', 'Name', 'Total', 'P', 'A', 'Late', 'HD', '%', 'Flag'];
    doc.fontSize(8).font('Helvetica-Bold');
    hdrs.forEach((h, i) => doc.text(h, cols[i] ?? 50, y, { width: 50 }));
    y += 14;

    doc.font('Helvetica').fontSize(7);
    for (const r of report) {
      if (y > 760) { doc.addPage(); y = 50; }
      const vals = [
        r.admissionNo.substring(0, 14),
        `${r.firstName} ${r.lastName}`.substring(0, 16),
        String(r.totalRecords),
        String(r.present),
        String(r.absent),
        String(r.late),
        String(r.halfDay),
        `${r.percentage}%`,
        r.belowThreshold ? '⚠️' : '✓',
      ];
      if (r.belowThreshold) doc.fillColor('#cc0000'); else doc.fillColor('#000000');
      vals.forEach((v, i) => doc.text(v, cols[i] ?? 50, y, { width: 50 }));
      y += 11;
    }

    doc.fillColor('#666666').fontSize(7);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} — Computer generated document`, 50, 790, { align: 'center', width: contentW });
    doc.end();
  } catch (error) {
    next(error);
  }
};

// ─── Export Monthly Report as XLSX ─────────────────────────

export const exportReportXlsx = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as MonthlyReportInput;
    const { report, month, year, classId, section } = await AttendanceService.getMonthlyReport({
      classId: Number(params.classId),
      section: String(params.section),
      month: Number(params.month),
      year: Number(params.year),
    });

    const rows = report.map((r) => ({
      'Admission No': r.admissionNo,
      'Name': `${r.firstName} ${r.lastName}`,
      'Roll No': r.rollNo ?? '',
      'Total': r.totalRecords,
      'Present': r.present,
      'Absent': r.absent,
      'Late': r.late,
      'Half Day': r.halfDay,
      'Excused': r.excused,
      'Percentage': r.percentage,
      'Below 75%': r.belowThreshold ? 'YES' : 'NO',
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Attendance');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${classId}_${section}_${month}_${year}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ─── Export Monthly Report as CSV ──────────────────────────

export const exportReportCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as MonthlyReportInput;
    const { report, month, year, classId, section } = await AttendanceService.getMonthlyReport({
      classId: Number(params.classId),
      section: String(params.section),
      month: Number(params.month),
      year: Number(params.year),
    });

    const rows = report.map((r) => ({
      'Admission No': r.admissionNo,
      'Name': `${r.firstName} ${r.lastName}`,
      'Roll No': r.rollNo ?? '',
      'Total': r.totalRecords,
      'Present': r.present,
      'Absent': r.absent,
      'Late': r.late,
      'Half Day': r.halfDay,
      'Excused': r.excused,
      'Percentage': r.percentage,
      'Below 75%': r.belowThreshold ? 'YES' : 'NO',
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    const csv = xlsx.utils.sheet_to_csv(ws);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${classId}_${section}_${month}_${year}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
