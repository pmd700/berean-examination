import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RichTextEditor from '../editor/RichTextEditor';
import SaveStatusIndicator from '../editor/SaveStatusIndicator';

export default function ContextApplicationModals({
  showContextModal,
  handleCloseContextModal,
  contextSaveStatus,
  contextContent,
  setContextContent,
  handleSaveContext,
  
  showApplicationModal,
  handleCloseApplicationModal,
  applicationSaveStatus,
  applicationContent,
  setApplicationContent,
  handleSaveApplication
}) {
  return (
    <>
      <Dialog open={showContextModal} onOpenChange={(open) => {
        if (!open) handleCloseContextModal();
      }}>
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="dark:text-white">
                Chapter Context
              </DialogTitle>
              <SaveStatusIndicator status={contextSaveStatus} />
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 py-4">
            <RichTextEditor
              content={contextContent}
              onChange={setContextContent}
              placeholder="Add historical background, cultural context, or literary structure..." />
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={handleCloseContextModal} className="dark:border-gray-700">
              Cancel
            </Button>
            <Button onClick={handleSaveContext} className="bg-orange-600 hover:bg-orange-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApplicationModal} onOpenChange={(open) => {
        if (!open) handleCloseApplicationModal();
      }}>
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="dark:text-white">
                Chapter Application
              </DialogTitle>
              <SaveStatusIndicator status={applicationSaveStatus} />
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 py-4">
            <RichTextEditor
              content={applicationContent}
              onChange={setApplicationContent}
              placeholder="How does this chapter apply to your life? What actions will you take?" />
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={handleCloseApplicationModal} className="dark:border-gray-700">
              Cancel
            </Button>
            <Button onClick={handleSaveApplication} className="bg-orange-600 hover:bg-orange-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}