import PDFDocument from 'pdfkit';

import { prisma } from '../config/database';
import { calculateGrade } from './exam.service';

/**
 * BFPS ERP - Report Card PDF Service (Phase 4E)
 * Generates A4 report card with BFPS letterhead,
 * subject-wise marks table, grades, total, rank, pass/fail.
 * Streamed from memory, never written to disk.
 */

interface ReportCardData {
  student: {
    admissionNo: string;
    firstName: string;
    lastName: string;
    rollNo: number | null;
    section: string;
    fatherName: string | null;
    motherName: string | null;
    dateOfBirth: Date | null;
  };
  className: string;
  examName: string;
  examType: string;
  academicYear: string;
  results: Array<{
    subjectName: string;
    subjectCode: string;
    maxMarks: number;
    marksObtained: number;
    grade: string;
    isPassed: boolean;
  }>;
  rank: number | null;
}

export async function getReportCardData(
  examId: number,
  studentId: number
): Promise<ReportCardData> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      class: { select: { name: true, section: true } },
    },
  });

  if (!exam) throw new Error('Exam not found');

  // Get all exams of same type in same class/year
  const relatedExams = await prisma.exam.findMany({
    where: {
      classId: exam.classId,
      examType: exam.examType,
      academicYear: exam.academicYear,
    },
    include: {
      subject: { select: { name: true, code: true } },
      results: {
        where: { studentId },
      },
    },
    orderBy: { subject: { name: 'asc' } },
  });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      admissionNo: true,
      firstName: true,
      lastName: true,
      rollNo: true,
      section: true,
      fatherName: true,
      motherName: true,
      dateOfBirth: true,
    },
  });

  if (!student) throw new Error('Student not found');

  const results = relatedExams
    .filter((e) => e.results.length > 0)
    .map((e) => {
      const r = e.results[0]!;
      return {
        subjectName: e.subject.name,
        subjectCode: e.subject.code,
        maxMarks: e.maxMarks,
        marksObtained: r.marksObtained,
        grade: r.grade || calculateGrade((r.marksObtained / e.maxMarks) * 100).grade,
        isPassed: r.isPassed,
      };
    });

  // Get rank from the primary exam
  const primaryResult = await prisma.examResult.findFirst({
    where: { examId, studentId },
  });

  return {
    student,
    className: `${exam.class.name}-${exam.class.section}`,
    examName: exam.name,
    examType: exam.examType,
    academicYear: exam.academicYear,
    results,
    rank: primaryResult?.rank ?? null,
  };
}

export function generateReportCardPdf(
  data: ReportCardData
): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const pageW = doc.page.width;
  const contentW = pageW - 80;

  // ─── Header ─────────────────────────────────────────────
  doc.rect(0, 0, pageW, 80).fill('#1a365d');
  doc.fill('#ffffff');
  doc.fontSize(18).font('Helvetica-Bold')
    .text('BABA FARID PUBLIC SCHOOL', 40, 15, { align: 'center', width: contentW });
  doc.fontSize(8).font('Helvetica')
    .text('Kilianwali, Sri Muktsar Sahib, Punjab | ICSE & ISC | Affiliation: PU170', 40, 38, { align: 'center', width: contentW });
  doc.fontSize(12).font('Helvetica-Bold')
    .text('REPORT CARD', 40, 55, { align: 'center', width: contentW });

  doc.fill('#000000');
  let y = 95;

  // ─── Exam Info Bar ──────────────────────────────────────
  doc.rect(40, y, contentW, 22).fill('#f0f4f8');
  doc.fill('#1a365d').fontSize(9).font('Helvetica-Bold');
  doc.text(`${data.examName} (${data.examType})`, 50, y + 6);
  doc.text(`Academic Year: ${data.academicYear}`, 300, y + 6, { width: 200, align: 'right' });
  doc.fill('#000000');
  y += 32;

  // ─── Student Details ────────────────────────────────────
  doc.fontSize(9).font('Helvetica');
  const studentDetails: [string, string][] = [
    ['Name', `${data.student.firstName} ${data.student.lastName}`],
    ['Admission No', data.student.admissionNo],
    ['Class / Section', data.className],
    ['Roll No', data.student.rollNo != null ? String(data.student.rollNo) : '-'],
    ['Father\'s Name', data.student.fatherName ?? '-'],
    ['Mother\'s Name', data.student.motherName ?? '-'],
    ['Date of Birth', data.student.dateOfBirth ? new Date(data.student.dateOfBirth).toLocaleDateString('en-IN') : '-'],
  ];

  for (let i = 0; i < studentDetails.length; i += 2) {
    const row1 = studentDetails[i]!;
    doc.font('Helvetica-Bold').text(`${row1[0]}:`, 40, y, { continued: true });
    doc.font('Helvetica').text(` ${row1[1]}`, { continued: false });

    if (i + 1 < studentDetails.length) {
      const row2 = studentDetails[i + 1]!;
      doc.font('Helvetica-Bold').text(`${row2[0]}:`, 320, y, { continued: true });
      doc.font('Helvetica').text(` ${row2[1]}`, { continued: false });
    }
    y += 16;
  }

  y += 10;

  // ─── Marks Table ────────────────────────────────────────
  const colX = { subject: 40, code: 200, max: 280, obtained: 340, pct: 400, grade: 455 };
  const colW = { subject: 155, code: 75, max: 55, obtained: 55, pct: 50, grade: 60 };

  // Table header
  doc.rect(40, y, contentW, 20).fill('#1a365d');
  doc.fill('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text('Subject', colX.subject + 5, y + 5, { width: colW.subject });
  doc.text('Code', colX.code + 5, y + 5, { width: colW.code });
  doc.text('Max', colX.max + 5, y + 5, { width: colW.max, align: 'center' });
  doc.text('Obtained', colX.obtained + 2, y + 5, { width: colW.obtained, align: 'center' });
  doc.text('%', colX.pct + 5, y + 5, { width: colW.pct, align: 'center' });
  doc.text('Grade', colX.grade + 5, y + 5, { width: colW.grade, align: 'center' });
  y += 20;

  doc.fill('#000000').font('Helvetica').fontSize(8);

  let totalMax = 0;
  let totalObtained = 0;
  let allPassed = true;

  for (let i = 0; i < data.results.length; i++) {
    const row = data.results[i]!;
    const rowBg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    doc.rect(40, y, contentW, 18).fill(rowBg);

    doc.fill('#000000');
    doc.text(row.subjectName, colX.subject + 5, y + 4, { width: colW.subject });
    doc.text(row.subjectCode, colX.code + 5, y + 4, { width: colW.code });
    doc.text(String(row.maxMarks), colX.max + 5, y + 4, { width: colW.max, align: 'center' });

    // Color code marks
    const marksColor = row.isPassed ? '#000000' : '#cc0000';
    doc.fill(marksColor).font('Helvetica-Bold');
    doc.text(String(row.marksObtained), colX.obtained + 2, y + 4, { width: colW.obtained, align: 'center' });

    const pct = row.maxMarks > 0 ? ((row.marksObtained / row.maxMarks) * 100).toFixed(1) : '0.0';
    doc.text(pct, colX.pct + 5, y + 4, { width: colW.pct, align: 'center' });

    // Grade badge color
    const gradeColor = getGradeColor(row.grade);
    doc.fill(gradeColor);
    doc.text(row.grade, colX.grade + 5, y + 4, { width: colW.grade, align: 'center' });
    doc.fill('#000000').font('Helvetica');

    totalMax += row.maxMarks;
    totalObtained += row.marksObtained;
    if (!row.isPassed) allPassed = false;

    y += 18;
  }

  // ─── Totals Row ─────────────────────────────────────────
  doc.rect(40, y, contentW, 22).fill('#e2e8f0');
  doc.fill('#1a365d').font('Helvetica-Bold').fontSize(9);
  doc.text('TOTAL', colX.subject + 5, y + 5, { width: colW.subject });
  doc.text(String(totalMax), colX.max + 5, y + 5, { width: colW.max, align: 'center' });
  doc.text(String(totalObtained), colX.obtained + 2, y + 5, { width: colW.obtained, align: 'center' });

  const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  doc.text(`${overallPct.toFixed(1)}%`, colX.pct + 5, y + 5, { width: colW.pct, align: 'center' });

  const overallGrade = calculateGrade(overallPct);
  doc.fill(getGradeColor(overallGrade.grade));
  doc.text(overallGrade.grade, colX.grade + 5, y + 5, { width: colW.grade, align: 'center' });
  y += 30;

  // ─── Summary ────────────────────────────────────────────
  doc.fill('#000000').font('Helvetica').fontSize(9);

  const resultText = allPassed ? 'PASSED' : 'FAILED';
  const resultColor = allPassed ? '#16a34a' : '#dc2626';

  doc.font('Helvetica-Bold').text('Result: ', 40, y, { continued: true });
  doc.fill(resultColor).text(resultText, { continued: false });
  doc.fill('#000000');

  if (data.rank) {
    doc.font('Helvetica-Bold').text(`Class Rank: ${data.rank}`, 300, y, { width: 200, align: 'right' });
  }
  y += 20;

  doc.font('Helvetica-Bold').text(`Overall Percentage: ${overallPct.toFixed(2)}%`, 40, y);
  doc.text(`Overall Grade: ${overallGrade.grade}`, 300, y, { width: 200, align: 'right' });
  y += 35;

  // ─── Signature Section ──────────────────────────────────
  doc.moveTo(40, y).lineTo(180, y).stroke('#999999');
  doc.moveTo(350, y).lineTo(pageW - 40, y).stroke('#999999');

  doc.fontSize(8).font('Helvetica');
  doc.text('Class Teacher', 40, y + 5, { width: 140, align: 'center' });
  doc.text('Principal', 350, y + 5, { width: pageW - 40 - 350, align: 'center' });
  y += 30;

  // ─── Footer ─────────────────────────────────────────────
  doc.fontSize(7).fillColor('#999999');
  doc.text(
    'This is a computer-generated report card. Baba Farid Public School — bfpsedu.in',
    40, y,
    { align: 'center', width: contentW }
  );

  return doc;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A1': case 'A2': return '#16a34a';
    case 'B1': case 'B2': return '#2563eb';
    case 'C1': case 'C2': return '#ca8a04';
    case 'D': return '#ea580c';
    case 'E': return '#dc2626';
    default: return '#000000';
  }
}
