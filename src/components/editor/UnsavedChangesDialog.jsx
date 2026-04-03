import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function UnsavedChangesDialog({ open, onStay, onLeave, onSaveAndLeave, isSaving = false }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onStay()}>
      <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isSaving ? (
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            )}
            <DialogTitle className="dark:text-white">
              {isSaving ? 'Saving...' : 'Unsaved changes'}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <DialogDescription className="text-gray-600 dark:text-gray-400 py-4">
          {isSaving 
            ? "Changes are still saving. Leaving now may lose updates."
            : "You have unsaved changes. If you leave now, they'll be lost."}
        </DialogDescription>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            onClick={onStay}
            variant="outline"
            className="dark:border-gray-700"
          >
            Stay
          </Button>
          <Button
            onClick={onSaveAndLeave}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={isSaving}
            autoFocus
          >
            {isSaving ? 'Saving...' : 'Save & Leave'}
          </Button>
          <Button
            onClick={onLeave}
            variant="outline"
            className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Leave anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}