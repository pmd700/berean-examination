import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";

export default function AIInsightsButton({ currentChapter }) {
  const [showAiInsightsModal, setShowAiInsightsModal] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const handleGenerateInsights = async () => {
    if (!currentChapter) return;
    setIsGeneratingInsights(true);
    setShowAiInsightsModal(true);
    setAiInsights(null);

    try {
      const response = await base44.functions.invoke('generateChapterInsights', {
        chapterText: currentChapter.raw_text,
        book: currentChapter.book,
        chapterNum: currentChapter.chapter_number
      });

      if (response.data && !response.data.error) {
        setAiInsights(response.data);
      } else {
        toast.error("Failed to generate insights.");
        setShowAiInsightsModal(false);
      }
    } catch (e) {
      toast.error("Error generating insights.");
      setShowAiInsightsModal(false);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleGenerateInsights}
        variant="outline"
        className="border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI Insights
      </Button>

      <Dialog open={showAiInsightsModal} onOpenChange={setShowAiInsightsModal}>
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              AI Chapter Insights
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {isGeneratingInsights ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mb-4" />
                <p>Analyzing chapter and generating insights...</p>
              </div>
            ) : aiInsights ? (
              <>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">Summary</h4>
                  <p className="text-gray-700 dark:text-gray-300">{aiInsights.summary}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">Historical & Cultural Context</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{aiInsights.context}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">Study Questions</h4>
                  <ul className="space-y-3">
                    {aiInsights.questions?.map((q, i) => (
                      <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300 bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg">
                        <span className="font-bold text-indigo-400">{i + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}