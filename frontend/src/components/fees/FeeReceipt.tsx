'use client';

import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface FeeReceiptProps {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  className: string;
  section: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  discount: number;
  fineAmount: number;
  paymentMethod: string;
  paidAt: string | null;
  onDownloadPdf?: () => void;
}

export function FeeReceipt({
  receiptNo,
  studentName,
  admissionNo,
  className,
  section,
  feeType,
  amount,
  paidAmount,
  discount,
  fineAmount,
  paymentMethod,
  paidAt,
  onDownloadPdf,
}: FeeReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const netAmount = amount - discount + fineAmount;
  const balance = netAmount - paidAmount;
  const isPaid = balance <= 0;

  const fmt = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;

  return (
    <Card className="shadow-md border-gray-200 max-w-md mx-auto" ref={receiptRef}>
      {/* Header */}
      <div className="bg-[#1a365d] text-white p-4 rounded-t-lg text-center">
        <h2 className="text-lg font-bold tracking-wide">BABA FARID PUBLIC SCHOOL</h2>
        <p className="text-[11px] text-gray-300 mt-0.5">
          Kilianwali, Sri Muktsar Sahib, Punjab | ICSE &amp; ISC | PU170
        </p>
        <div className="mt-2 inline-block bg-white/20 px-3 py-0.5 rounded text-xs font-bold tracking-wider">
          FEE RECEIPT
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Receipt No & Date */}
        <div className="flex justify-between text-sm">
          <span className="font-bold text-primary">Receipt: {receiptNo}</span>
          <span className="text-muted-foreground">
            {paidAt ? new Date(paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
          </span>
        </div>

        {/* Details Grid */}
        <div className="border rounded-lg overflow-hidden text-sm">
          {[
            ['Student', studentName],
            ['Admission No', admissionNo],
            ['Class / Section', `${className} - ${section}`],
            ['Fee Type', feeType],
            ['Amount', fmt(amount)],
            ['Discount', fmt(discount)],
            ['Fine', fmt(fineAmount)],
            ['Net Amount', fmt(netAmount)],
            ['Paid', fmt(paidAmount)],
            ['Method', paymentMethod],
          ].map(([label, value], i) => (
            <div key={label} className={`flex justify-between px-3 py-1.5 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
              <span className="font-medium text-muted-foreground">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>

        {/* Balance */}
        {balance > 0 && (
          <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-center">
            <span className="text-red-700 font-bold text-sm">Balance Due: {fmt(balance)}</span>
          </div>
        )}

        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-center">
            <span className="text-green-700 font-bold text-sm">✓ FULLY PAID</span>
          </div>
        )}

        {/* Download */}
        {onDownloadPdf && (
          <div className="pt-2 text-center">
            <Button variant="outline" size="sm" onClick={onDownloadPdf} className="gap-1.5 text-xs font-semibold">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-center text-muted-foreground pt-1">
          Computer-generated receipt. No signature required. — bfpsedu.in
        </p>
      </CardContent>
    </Card>
  );
}
