'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeeReceipt } from '@/components/fees/FeeReceipt';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, IndianRupee, CreditCard, Search } from 'lucide-react';

const paymentMethods = [
  { value: 'CASH', label: '💵 Cash' },
  { value: 'UPI', label: '📱 UPI' },
  { value: 'BANK_TRANSFER', label: '🏦 Bank Transfer' },
  { value: 'CHEQUE', label: '📄 Cheque' },
  { value: 'RAZORPAY', label: '💳 Razorpay Online' },
];

export default function FeeCollectPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Student lookup
  const [admissionNo, setAdmissionNo] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [student, setStudent] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Fee structures
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [structures, setStructures] = useState<any[]>([]);

  // Collection form
  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [discount, setDiscount] = useState('0');
  const [fineAmount, setFineAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [notes, setNotes] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [transactionId, setTransactionId] = useState('');

  // Result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [receipt, setReceipt] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user) {
      api.get('/fees/structures').then((res) => setStructures(res.data?.data || [])).catch(() => {});
    }
  }, [authLoading, user, router]);

  const lookupStudent = async () => {
    if (!admissionNo.trim()) return;
    setLookupLoading(true);
    setStudent(null);
    setError(null);
    try {
      const res = await api.get(`/students?admissionNo=${admissionNo.trim()}&take=1`);
      const students = res.data?.data?.students || [];
      if (students.length > 0) {
        setStudent(students[0]);
      } else {
        setError(`No student found with Admission No: ${admissionNo}`);
      }
    } catch {
      setError('Failed to search student.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAutoFillAmount = (selectedFeeType: string) => {
    setFeeType(selectedFeeType);
    const matched = structures.find(
      (s) => s.feeType === selectedFeeType && s.academicYear === academicYear
    );
    if (matched) {
      setAmount(String(matched.amount));
      setPaidAmount(String(matched.amount));
    }
  };

  const handleSubmit = async () => {
    if (!student || !feeType || !amount || !paidAmount || !paymentMethod) return;
    setSaving(true);
    setError(null);
    setReceipt(null);

    if (paymentMethod === 'RAZORPAY') {
      try {
        const res = await api.post('/fees/razorpay/order', {
          studentId: student.id,
          feeType,
          amount: Number(amount),
          academicYear,
        });
        const order = res.data?.data;
        if (order?.orderId) {
          setReceipt({ ...order, status: 'RAZORPAY_ORDER_CREATED', message: 'Razorpay order created. Share with parent for online payment.' });
        }
      } catch {
        setError('Failed to create Razorpay order.');
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      const payload = {
        studentId: student.id,
        feeType,
        amount: Number(amount),
        paidAmount: Number(paidAmount),
        discount: Number(discount),
        fineAmount: Number(fineAmount),
        paymentMethod,
        academicYear,
        notes: notes || undefined,
        chequeNo: chequeNo || undefined,
        transactionId: transactionId || undefined,
      };
      const res = await api.post('/fees/collect', payload);
      const result = res.data?.data;
      setReceipt({
        receiptNo: result.payment.receiptNo,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo,
        className: student.class?.name || '',
        section: student.section,
        feeType,
        amount: Number(amount),
        paidAmount: Number(paidAmount),
        discount: Number(discount),
        fineAmount: Number(fineAmount),
        paymentMethod,
        paidAt: new Date().toISOString(),
        balance: result.balance,
        paymentId: result.payment.id,
      });
    } catch {
      setError('Failed to collect fee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!receipt?.paymentId) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/fees/receipt/${receipt.paymentId}`;
    window.open(url, '_blank');
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-muted-foreground">Loading session...</div>;

  const netAmount = Number(amount || 0) - Number(discount || 0) + Number(fineAmount || 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
        <div className="flex items-center gap-3">
          <IndianRupee className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Collect Fee</h1>
        </div>

        {/* Student Lookup */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-lg">Find Student</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Admission Number</label>
                <input
                  type="text"
                  placeholder="e.g. BFPS-2025-001"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookupStudent()}
                  className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none"
                />
              </div>
              <Button onClick={lookupStudent} disabled={lookupLoading} className="gap-1.5 font-semibold">
                <Search className="h-4 w-4" /> {lookupLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {student && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm space-y-1">
                <p className="font-bold text-blue-800">{student.firstName} {student.lastName}</p>
                <p>Adm No: {student.admissionNo} | Class: {student.class?.name}-{student.section} | Roll: {student.rollNo ?? '-'}</p>
                <p>Parent: {student.fatherName} | Phone: {student.parentPhone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">{error}</div>}

        {/* Collection Form */}
        {student && !receipt && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Academic Year</label>
                  <Select value={academicYear} onValueChange={setAcademicYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['2024-2025', '2025-2026', '2026-2027'].map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fee Type</label>
                  <Select value={feeType} onValueChange={handleAutoFillAmount}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {[...new Set(structures.map((s) => s.feeType))].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Amount (₹)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0"
                    className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Discount (₹)</label>
                  <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} min="0"
                    className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fine (₹)</label>
                  <input type="number" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} min="0"
                    className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Paying Amount (₹)</label>
                  <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} min="0"
                    className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none font-bold" />
                </div>
                {paymentMethod === 'CHEQUE' && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Cheque No</label>
                    <input type="text" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)}
                      className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none" />
                  </div>
                )}
                {(paymentMethod === 'UPI' || paymentMethod === 'BANK_TRANSFER') && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Transaction ID</label>
                    <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none" />
                  </div>
                )}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes (optional)</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks..."
                    className="w-full h-10 px-3 text-sm border rounded-md bg-white focus:ring-1 focus:ring-primary/30 outline-none" />
                </div>
              </div>

              {/* Summary Bar */}
              <div className="mt-4 p-3 bg-gray-50 border rounded flex flex-wrap gap-4 text-sm items-center justify-between">
                <div className="space-x-4">
                  <span>Net: <strong>₹{netAmount.toLocaleString('en-IN')}</strong></span>
                  <span>Paying: <strong className="text-green-700">₹{Number(paidAmount || 0).toLocaleString('en-IN')}</strong></span>
                  {netAmount - Number(paidAmount || 0) > 0 && (
                    <span className="text-red-600 font-bold">Balance: ₹{(netAmount - Number(paidAmount || 0)).toLocaleString('en-IN')}</span>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !feeType || !amount || !paymentMethod}
                  className="gap-2 px-6 font-semibold shadow-md"
                >
                  <IndianRupee className="h-4 w-4" />
                  {saving ? 'Processing...' : paymentMethod === 'RAZORPAY' ? 'Create Razorpay Order' : 'Collect Payment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Receipt Display */}
        {receipt && receipt.receiptNo && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800 font-bold text-center">
              ✓ Payment Collected Successfully — Receipt #{receipt.receiptNo}
            </div>
            <FeeReceipt
              receiptNo={receipt.receiptNo}
              studentName={receipt.studentName}
              admissionNo={receipt.admissionNo}
              className={receipt.className}
              section={receipt.section}
              feeType={receipt.feeType}
              amount={receipt.amount}
              paidAmount={receipt.paidAmount}
              discount={receipt.discount}
              fineAmount={receipt.fineAmount}
              paymentMethod={receipt.paymentMethod}
              paidAt={receipt.paidAt}
              onDownloadPdf={handleDownloadPdf}
            />
            <div className="text-center">
              <Button variant="outline" onClick={() => { setReceipt(null); setStudent(null); setAdmissionNo(''); }} className="font-semibold">
                Collect Another Payment
              </Button>
            </div>
          </div>
        )}

        {receipt && receipt.status === 'RAZORPAY_ORDER_CREATED' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm space-y-2">
            <p className="font-bold text-blue-800">💳 Razorpay Order Created</p>
            <p>Order ID: <code className="bg-white px-1 rounded">{receipt.orderId}</code></p>
            <p>Amount: ₹{(receipt.amount / 100).toLocaleString('en-IN')}</p>
            <p className="text-muted-foreground">{receipt.message}</p>
          </div>
        )}
      </main>
    </div>
  );
}
