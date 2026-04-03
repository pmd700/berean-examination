import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save, X, Link2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import KeywordLinker from './KeywordLinker';

export default function AnnotationPopup({ 
  isOpen, 
  onClose, 
  selectedText, 
  existingAnnotation,
  onSave,
  keywords 
}) {
  const [commentary, setCommentary] = useState('');
  const [showKeywordLinker, setShowKeywordLinker] = useState(false);
  const [linkedKeywords, setLinkedKeywords] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingAnnotation) {
      setCommentary(existingAnnotation.commentary || '');
      setLinkedKeywords(existingAnnotation.linked_keywords || []);
    } else {
      setCommentary('');
      setLinkedKeywords([]);
    }
  }, [existingAnnotation, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ 
      commentary, 
      linked_keywords: linkedKeywords 
    });
    setSaving(false);
    onClose();
  };

  const handleLinkKeyword = (keywordId) => {
    if (!linkedKeywords.includes(keywordId)) {
      setLinkedKeywords([...linkedKeywords, keywordId]);
    }
    setShowKeywordLinker(false);
  };

  const removeLinkedKeyword = (keywordId) => {
    setLinkedKeywords(linkedKeywords.filter(id => id !== keywordId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
        <DialogHeader>
          <DialogTitle className="text-purple-900 dark:text-purple-100 font-serif text-xl">
            {existingAnnotation ? 'Edit Annotation' : 'Add Commentary'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
            <p className="text-sm text-purple-600 dark:text-purple-300 mb-1 font-medium">Selected Text:</p>
            <p className="text-gray-900 dark:text-gray-100 font-serif italic">"{selectedText}"</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Commentary
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKeywordLinker(true)}
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                <Link2 className="w-4 h-4 mr-1" />
                Link Keyword (⌘/Ctrl+K)
              </Button>
            </div>
            <RichTextEditor 
              value={commentary}
              onChange={setCommentary}
              placeholder="Write your expository commentary here..."
            />
          </div>

          {linkedKeywords.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Linked Keywords
              </label>
              <div className="flex flex-wrap gap-2">
                {linkedKeywords.map(kwId => {
                  const kw = keywords?.find(k => k.id === kwId);
                  if (!kw) return null;
                  return (
                    <span 
                      key={kwId}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      {kw.title}
                      <button 
                        onClick={() => removeLinkedKeyword(kwId)}
                        className="hover:text-blue-900 dark:hover:text-blue-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="dark:border-gray-600">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save Commentary'}
          </Button>
        </DialogFooter>

        <KeywordLinker
          isOpen={showKeywordLinker}
          onClose={() => setShowKeywordLinker(false)}
          keywords={keywords}
          onSelect={handleLinkKeyword}
        />
      </DialogContent>
    </Dialog>
  );
}