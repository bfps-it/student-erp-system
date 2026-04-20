import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { prisma } from '../config/database';

/**
 * Handles the generation of physical ID Cards in PDF format given a student ID.
 */
export async function generateIdCardPdfStream(studentId: number): Promise<typeof PDFDocument> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // 2.1 x 3.3 inches equivalent in PDF points (72 points = 1 inch)
  const doc = new PDFDocument({ size: [153, 243], margin: 10 }); 

  // Add school header
  doc.fontSize(10).font('Helvetica-Bold').text('B.F.P.S', { align: 'center' });
  doc.fontSize(6).font('Helvetica').text('Kilianwali, Punjab', { align: 'center' });
  doc.moveDown(1);

  // Add QR Code linking to verification (can verify via ERP app)
  const qrData = JSON.stringify({ admNo: student.admissionNo, id: student.id });
  const qrBase64 = await QRCode.toDataURL(qrData, { margin: 1 });
  const qrBuffer = Buffer.from(qrBase64.split(',')[1] || '', 'base64');
  
  // Profile picture placeholder
  doc.rect(56, 35, 40, 50).stroke();

  doc.moveDown(6);

  // Add student details
  doc.fontSize(9).font('Helvetica-Bold').text(`${student.firstName} ${student.lastName}`, { align: 'center' });
  doc.fontSize(7).font('Helvetica');
  doc.moveDown(0.5);
  doc.text(`ADM No: ${student.admissionNo}`);
  doc.text(`Class: ${student.class.name} - ${student.class.section}`);
  doc.text(`DOB: ${student.dateOfBirth.toISOString().split('T')[0]}`);
  if (student.bloodGroup) doc.text(`Blood Grp: ${student.bloodGroup}`);
  doc.text(`Parent No: ${student.parentPhone}`);

  // Place QR Code in bottom right
  doc.image(qrBuffer, 105, 195, { width: 35 });

  doc.end();

  return doc;
}
