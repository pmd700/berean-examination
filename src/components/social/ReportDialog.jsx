import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel
} from '@/components/ui/alert-dialog';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export default function ReportDialog({ targetEmail, targetName, reporterEmail, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    setSubmitting(true);
    await base44.entities.UserReport.create({
      reporter_email: reporterEmail,
      reported_email: targetEmail,
      reason,
      details: details.trim(),
    });
    toast.success('Report submitted. Thank you.');
    setSubmitting(false);
    onClose();
  };

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent className="bg-gray-900 border-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Report {targetName}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Select a reason for reporting this user.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map(r => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  reason === r.value
                    ? 'border-amber-600 bg-amber-600/20 text-amber-300'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional: provide more details..."
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-gray-200 text-sm resize-none placeholder:text-gray-500"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={submitting || !reason} className="bg-red-600 hover:bg-red-700">
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}