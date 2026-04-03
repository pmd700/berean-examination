import React, { useState, useEffect, useCallback } from 'react';
import { Edit3 } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { parseChapterText, tokenizeVerseText } from '../utils/chapterParser';

export default function ChapterRenderer({ 
  book, 
  chapter, 
  rawText, 
  annotations, 
  keywords,
  onAnnotate,
  onEditAnnotation 
}) {
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [isShiftHeld, setIsShiftHeld] = useState(false);

  // Parse the raw text into verses and headers
  const parsedContent = React.useMemo(() => {
    const blocks = parseChapterText(rawText, chapter);
    // Add tokenized words to each verse block
    return blocks.map(block => {
      if (block.type === 'verse') {
        return {
          ...block,
          words: tokenizeVerseText(block.text).map(text => ({ text }))
        };
      }
      return block;
    });
  }, [rawText, chapter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setIsShiftHeld(true);
      if (e.key === 'Enter' && selectionStart !== null) {
        e.preventDefault();
        const selectedText = getSelectedText();
        if (selectedText) {
          onAnnotate({
            startIndex: Math.min(selectionStart, selectionEnd || selectionStart),
            endIndex: Math.max(selectionStart, selectionEnd || selectionStart),
            text: selectedText
          });
        }
      }
      if (e.key === 'Escape') {
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setIsShiftHeld(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectionStart, selectionEnd, onAnnotate]);

  const handleWordClick = (wordIndex, e) => {
    e.preventDefault();
    
    if (isShiftHeld && selectionStart !== null) {
      setSelectionEnd(wordIndex);
    } else {
      setSelectionStart(wordIndex);
      setSelectionEnd(null);
    }
  };

  const getSelectedText = () => {
    if (selectionStart === null) return '';
    const start = Math.min(selectionStart, selectionEnd || selectionStart);
    const end = Math.max(selectionStart, selectionEnd || selectionStart);
    
    const allWords = [];
    parsedContent.forEach(item => {
      if (item.type === 'verse') {
        item.words.forEach(w => allWords.push(w.text));
      }
    });
    
    return allWords.slice(start, end + 1).join(' ');
  };

  const isWordSelected = (index) => {
    if (selectionStart === null) return false;
    const start = Math.min(selectionStart, selectionEnd || selectionStart);
    const end = Math.max(selectionStart, selectionEnd || selectionStart);
    return index >= start && index <= end;
  };

  const getWordAnnotation = (index) => {
    return annotations?.find(a => 
      index >= a.start_word_index && index <= a.end_word_index
    );
  };

  const getKeywordForWord = (index) => {
    const annotation = getWordAnnotation(index);
    if (!annotation?.linked_keywords?.length) return null;
    return keywords?.find(k => annotation.linked_keywords.includes(k.id));
  };

  let globalWordIndex = 0;

  return (
    <div className="chapter-content font-serif leading-relaxed">
      {parsedContent.map((item, itemIndex) => {
        if (item.type === 'header') {
          return (
            <h3 key={itemIndex} className="text-xl font-bold text-purple-900 dark:text-purple-100 mt-8 mb-4 first:mt-0">
              {item.text}
            </h3>
          );
        }

        const verseStartIndex = globalWordIndex;
        const verseContent = item.words.map((word, wordIdx) => {
          const currentIndex = globalWordIndex++;
          const annotation = getWordAnnotation(currentIndex);
          const keyword = getKeywordForWord(currentIndex);
          const isSelected = isWordSelected(currentIndex);
          const isAnnotated = !!annotation;
          const isFirstWordOfAnnotation = annotation && currentIndex === annotation.start_word_index;

          const wordElement = (
            <span
              key={currentIndex}
              onClick={(e) => handleWordClick(currentIndex, e)}
              className={`
                cursor-pointer transition-all duration-150 relative inline
                ${isSelected ? 'bg-purple-200 dark:bg-purple-700 rounded px-0.5' : ''}
                ${isAnnotated && !isSelected ? 'underline decoration-purple-400 decoration-2 underline-offset-2' : ''}
                ${keyword ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700' : 'hover:text-purple-600 dark:hover:text-purple-300'}
              `}
            >
              {isFirstWordOfAnnotation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAnnotation(annotation);
                  }}
                  className="absolute -top-4 -left-1 p-0.5 bg-purple-100 dark:bg-purple-800 rounded hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
                >
                  <Edit3 className="w-3 h-3 text-purple-600 dark:text-purple-300" />
                </button>
              )}
              {word.text}
            </span>
          );

          if (keyword) {
            return (
              <HoverCard key={currentIndex} openDelay={200}>
                <HoverCardTrigger asChild>
                  {wordElement}
                </HoverCardTrigger>
                <HoverCardContent className="w-80 bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-700">
                  <div className="space-y-2">
                    <h4 className="font-bold text-purple-900 dark:text-purple-100">{keyword.title}</h4>
                    <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide">{keyword.category}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3" 
                       dangerouslySetInnerHTML={{ __html: keyword.explanation?.substring(0, 150) + '...' }} />
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }

          return wordElement;
        });

        return (
          <div key={itemIndex} className="mb-4 text-gray-800 dark:text-gray-200">
            <sup className="text-purple-500 dark:text-purple-400 font-semibold mr-1 text-xs align-top">{item.verseNumber}</sup>
            <span className="inline">
              {verseContent.map((word, i) => (
                <React.Fragment key={i}>{word}{' '}</React.Fragment>
              ))}
            </span>
          </div>
        );
      })}

      {selectionStart !== null && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-purple-900 dark:bg-purple-800 text-white px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-3">
          <span className="text-sm">Press <kbd className="px-2 py-0.5 bg-purple-700 rounded text-xs">Enter</kbd> to add commentary</span>
          <span className="text-purple-300">|</span>
          <span className="text-sm text-purple-200">Hold <kbd className="px-2 py-0.5 bg-purple-700 rounded text-xs">Shift</kbd> + click to extend selection</span>
        </div>
      )}
    </div>
  );
}