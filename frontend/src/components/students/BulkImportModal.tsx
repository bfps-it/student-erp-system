import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import api from '@/lib/axios';

interface BulkImportModalProps {
  onSuccess: () => void;
}

export function BulkImportModal({ onSuccess }: BulkImportModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(res.data.data);
      onSuccess();
    } catch (err: unknown) {
      console.error(err);
      setError('An error occurred during file upload. Please ensure the file is an Excel/CSV matching the template.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="font-semibold shadow-sm">
          Bulk Import (CSV/Excel)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            Upload a standard Excel or CSV file to quickly import batch students.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 flex flex-col gap-4">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all font-mono"
          />
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
              {error}
            </div>
          )}

          {results && (
            <div className="p-4 bg-gray-50 border border-gray-100 rounded text-sm space-y-1">
              <p className="font-medium text-gray-800 border-b pb-2 mb-2">Import Summary</p>
              <p>Total Processed: <span className="font-semibold">{results.total}</span></p>
              <p className="text-green-600">Successfully Imported: <span className="font-semibold">{results.successful}</span></p>
              {results.failed > 0 && (
                 <p className="text-red-500 font-semibold mb-2">Failed: {results.failed}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setOpen(false); setResults(null); setError(null); }}>
            Close
          </Button>
          <Button disabled={!file || loading} onClick={handleUpload}>
            {loading ? 'Uploading & Processing...' : 'Upload Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
