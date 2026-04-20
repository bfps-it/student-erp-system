import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { decrypt, maskValue } from '../utils/encryption';
import logger from '../utils/logger';

// ─── Interfaces ────────────────────────────────────────────

export interface AttendanceSummary {
  academicYear: string;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  excused: number;
  percentage: number;
}

export interface ExamResultEntry {
  examName: string;
  examType: string;
  subjectName: string;
  subjectCode: string;
  maxMarks: number;
  marksObtained: number;
  percentage: number;
  grade: string | null;
  isPassed: boolean;
  examDate: string;
  academicYear: string;
}

export interface FeeEntry {
  receiptNo: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  discount: number;
  fineAmount: number;
  status: string;
  paymentMethod: string | null;
  paidAt: string | null;
  academicYear: string;
}

export interface StudentProfile {
  id: number;
  admissionNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string | null;
  className: string;
  section: string;
  rollNo: number | null;
  fatherName: string;
  motherName: string | null;
  parentPhone: string;
  admissionDate: string;
  aadhaarMasked: string | null;
  photoUrl: string | null;
  isActive: boolean;
}

export interface JourneyData {
  student: StudentProfile;
  attendanceSummary: AttendanceSummary[];
  examResults: ExamResultEntry[];
  feeHistory: FeeEntry[];
  coCurricular: never[];
  awards: never[];
  leaveRecords: never[];
  disciplinaryRecords: never[];
}

// ─── Helpers ───────────────────────────────────────────────

function getAcademicYear(date: Date): string {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// ─── Journey Data Aggregation ──────────────────────────────

export async function getJourneyData(studentId: number): Promise<JourneyData> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      attendance: { orderBy: { date: 'asc' } },
      examResults: {
        include: { exam: { include: { subject: true } } },
      },
      feePayments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!student) throw new Error('Student not found');

  // Masked Aadhaar
  let aadhaarMasked: string | null = null;
  if (student.aadhaarEncrypted) {
    try {
      aadhaarMasked = maskValue(decrypt(student.aadhaarEncrypted));
    } catch { aadhaarMasked = null; }
  }

  const profile: StudentProfile = {
    id: student.id,
    admissionNo: student.admissionNo,
    firstName: student.firstName,
    lastName: student.lastName,
    dateOfBirth: student.dateOfBirth.toISOString().split('T')[0] || '',
    gender: student.gender,
    bloodGroup: student.bloodGroup,
    className: student.class.name,
    section: student.section,
    rollNo: student.rollNo,
    fatherName: student.fatherName,
    motherName: student.motherName ?? null,
    parentPhone: student.parentPhone,
    admissionDate: student.admissionDate.toISOString().split('T')[0] || '',
    aadhaarMasked,
    photoUrl: student.photoUrl,
    isActive: student.isActive,
  };

  // ── Attendance by academic year ──
  const yearMap = new Map<string, { present: number; absent: number; late: number; halfDay: number; excused: number; total: number }>();
  for (const rec of student.attendance) {
    const yr = getAcademicYear(rec.date);
    if (!yearMap.has(yr)) yearMap.set(yr, { present: 0, absent: 0, late: 0, halfDay: 0, excused: 0, total: 0 });
    const s = yearMap.get(yr)!;
    s.total++;
    if (rec.status === 'PRESENT') s.present++;
    else if (rec.status === 'ABSENT') s.absent++;
    else if (rec.status === 'LATE') s.late++;
    else if (rec.status === 'HALF_DAY') s.halfDay++;
    else if (rec.status === 'EXCUSED') s.excused++;
  }

  const attendanceSummary: AttendanceSummary[] = Array.from(yearMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, d]) => ({
      academicYear: year,
      totalRecords: d.total,
      present: d.present,
      absent: d.absent,
      late: d.late,
      halfDay: d.halfDay,
      excused: d.excused,
      percentage: d.total > 0 ? Math.round(((d.present + d.late + d.halfDay * 0.5) / d.total) * 10000) / 100 : 0,
    }));

  // ── Exam results ──
  const examResults: ExamResultEntry[] = student.examResults.map((er) => ({
    examName: er.exam.name,
    examType: er.exam.examType,
    subjectName: er.exam.subject.name,
    subjectCode: er.exam.subject.code,
    maxMarks: er.exam.maxMarks,
    marksObtained: er.marksObtained,
    percentage: er.percentage ?? Math.round((er.marksObtained / er.exam.maxMarks) * 10000) / 100,
    grade: er.grade,
    isPassed: er.isPassed,
    examDate: er.exam.examDate.toISOString().split('T')[0] || '',
    academicYear: er.exam.academicYear,
  }));

  // ── Fee history ──
  const feeHistory: FeeEntry[] = student.feePayments.map((fp) => ({
    receiptNo: fp.receiptNo,
    feeType: fp.feeType,
    amount: fp.amount,
    paidAmount: fp.paidAmount,
    discount: fp.discount,
    fineAmount: fp.fineAmount,
    status: fp.status,
    paymentMethod: fp.paymentMethod,
    paidAt: fp.paidAt ? (fp.paidAt.toISOString().split('T')[0] ?? null) : null,
    academicYear: fp.academicYear,
  }));

  logger.info(`Academic journey retrieved for student ${student.admissionNo}`);

  return {
    student: profile,
    attendanceSummary,
    examResults,
    feeHistory,
    coCurricular: [],
    awards: [],
    leaveRecords: [],
    disciplinaryRecords: [],
  };
}

// ─── Journey PDF with School Letterhead ────────────────────

export async function generateJourneyPdf(studentId: number): Promise<PDFKit.PDFDocument> {
  const journey = await getJourneyData(studentId);
  const { student } = journey;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const pageW = doc.page.width;
  const contentW = pageW - 100; // margins

  // ── Letterhead ──
  doc.rect(0, 0, pageW, 110).fill('#1a365d');
  doc.fill('#ffffff');
  doc.fontSize(18).font('Helvetica-Bold').text('BABA FARID PUBLIC SCHOOL', 50, 20, { align: 'center', width: contentW });
  doc.fontSize(9).font('Helvetica').text('Kilianwali, Sri Muktsar Sahib, Punjab - 152026', 50, 42, { align: 'center', width: contentW });
  doc.text('ICSE & ISC Board | Affiliation Code: PU170 | www.bfpsedu.in', 50, 54, { align: 'center', width: contentW });
  doc.fontSize(12).font('Helvetica-Bold').text('ACADEMIC JOURNEY REPORT', 50, 78, { align: 'center', width: contentW });

  doc.fill('#000000');
  let y = 125;

  // ── Student Info ──
  doc.fontSize(10).font('Helvetica-Bold').text('Student Information', 50, y);
  y += 16;
  doc.fontSize(9).font('Helvetica');
  const info = [
    [`Name: ${student.firstName} ${student.lastName}`, `Admission No: ${student.admissionNo}`],
    [`Class: ${student.className} - ${student.section}`, `Roll No: ${student.rollNo ?? 'N/A'}`],
    [`DOB: ${student.dateOfBirth}`, `Gender: ${student.gender}`],
    [`Father: ${student.fatherName}`, `Phone: ${student.parentPhone}`],
    [`Admission Date: ${student.admissionDate}`, `Aadhaar: ${student.aadhaarMasked ?? 'Not provided'}`],
  ];
  for (const row of info) {
    doc.text(row[0] ?? '', 50, y, { width: contentW / 2 });
    doc.text(row[1] ?? '', 50 + contentW / 2, y, { width: contentW / 2 });
    y += 14;
  }
  y += 8;
  doc.moveTo(50, y).lineTo(pageW - 50, y).stroke('#cccccc');
  y += 12;

  // ── Attendance Summary ──
  doc.fontSize(10).font('Helvetica-Bold').text('Attendance Summary', 50, y);
  y += 16;
  if (journey.attendanceSummary.length === 0) {
    doc.fontSize(9).font('Helvetica').text('No attendance records available.', 50, y);
    y += 14;
  } else {
    // Table header
    doc.fontSize(8).font('Helvetica-Bold');
    const cols = [50, 140, 200, 255, 305, 355, 410, 465];
    const headers = ['Year', 'Total', 'Present', 'Absent', 'Late', 'Half Day', 'Excused', '%'];
    headers.forEach((h, i) => doc.text(h, cols[i] ?? 50, y, { width: 55 }));
    y += 12;
    doc.font('Helvetica').fontSize(8);
    for (const a of journey.attendanceSummary) {
      const vals = [a.academicYear, String(a.totalRecords), String(a.present), String(a.absent), String(a.late), String(a.halfDay), String(a.excused), `${a.percentage}%`];
      vals.forEach((v, i) => doc.text(v, cols[i] ?? 50, y, { width: 55 }));
      y += 12;
    }
  }
  y += 8;
  doc.moveTo(50, y).lineTo(pageW - 50, y).stroke('#cccccc');
  y += 12;

  // ── Exam Results ──
  doc.fontSize(10).font('Helvetica-Bold').text('Examination Results', 50, y);
  y += 16;
  if (journey.examResults.length === 0) {
    doc.fontSize(9).font('Helvetica').text('No examination records available.', 50, y);
    y += 14;
  } else {
    doc.fontSize(8).font('Helvetica-Bold');
    const eCols = [50, 140, 240, 310, 360, 410, 460];
    const eHeaders = ['Exam', 'Subject', 'Year', 'Max', 'Obtained', '%', 'Grade'];
    eHeaders.forEach((h, i) => doc.text(h, eCols[i] ?? 50, y, { width: 60 }));
    y += 12;
    doc.font('Helvetica').fontSize(8);
    for (const e of journey.examResults) {
      if (y > 750) { doc.addPage(); y = 50; }
      const vals = [e.examName.substring(0, 14), e.subjectName.substring(0, 14), e.academicYear, String(e.maxMarks), String(e.marksObtained), `${e.percentage}%`, e.grade ?? '-'];
      vals.forEach((v, i) => doc.text(v, eCols[i] ?? 50, y, { width: 60 }));
      y += 12;
    }
  }
  y += 8;
  doc.moveTo(50, y).lineTo(pageW - 50, y).stroke('#cccccc');
  y += 12;

  // ── Fee Payment History ──
  if (y > 680) { doc.addPage(); y = 50; }
  doc.fontSize(10).font('Helvetica-Bold').text('Fee Payment History', 50, y);
  y += 16;
  if (journey.feeHistory.length === 0) {
    doc.fontSize(9).font('Helvetica').text('No fee records available.', 50, y);
    y += 14;
  } else {
    doc.fontSize(8).font('Helvetica-Bold');
    const fCols = [50, 120, 200, 260, 320, 380, 440];
    const fHeaders = ['Receipt', 'Type', 'Year', 'Amount', 'Paid', 'Status', 'Date'];
    fHeaders.forEach((h, i) => doc.text(h, fCols[i] ?? 50, y, { width: 60 }));
    y += 12;
    doc.font('Helvetica').fontSize(8);
    for (const f of journey.feeHistory) {
      if (y > 750) { doc.addPage(); y = 50; }
      const vals = [f.receiptNo.substring(0, 12), f.feeType.substring(0, 12), f.academicYear, `₹${f.amount}`, `₹${f.paidAmount}`, f.status, f.paidAt ?? '-'];
      vals.forEach((v, i) => doc.text(v, fCols[i] ?? 50, y, { width: 60 }));
      y += 12;
    }
  }

  // ── Placeholder Sections ──
  y += 12;
  if (y > 700) { doc.addPage(); y = 50; }
  doc.moveTo(50, y).lineTo(pageW - 50, y).stroke('#cccccc');
  y += 12;
  doc.fontSize(9).font('Helvetica').fillColor('#888888');
  doc.text('Co-Curricular Activities, Awards, Leave Records, and Disciplinary Records will appear here once those modules are activated.', 50, y, { width: contentW });
  y += 28;

  // ── Footer ──
  doc.fillColor('#666666').fontSize(8).font('Helvetica');
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} — This is a computer-generated document.`, 50, 780, { align: 'center', width: contentW });

  doc.end();
  return doc;
}
