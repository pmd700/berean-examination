import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { NEW_TESTAMENT } from '../utils/bibleData';

export default function useInterlinearChapter(currentChapter, interlinearEnabled) {
  const [interlinearVerses, setInterlinearVerses] = useState({});
  const [isLoadingInterlinear, setIsLoadingInterlinear] = useState(false);

  const isNewTestament = NEW_TESTAMENT.includes(currentChapter?.book);
  const isOldTestament = !!currentChapter && !isNewTestament;
  const effectiveSource = isNewTestament ? 'SBLGNT' : 'UXLC';
  const entityName = isNewTestament ? 'GreekSourceVerse' : 'HebrewSourceVerse';
  const textField = isNewTestament ? 'greek_text' : 'hebrew_text';

  useEffect(() => {
    let isMounted = true;

    const loadInterlinearChapter = async () => {
      if (!currentChapter || !interlinearEnabled) {
        if (isMounted) {
          setInterlinearVerses({});
          setIsLoadingInterlinear(false);
        }
        return;
      }

      setIsLoadingInterlinear(true);
      const verses = await base44.entities[entityName].filter({
        source_text: effectiveSource,
        book: currentChapter.book,
        chapter: currentChapter.chapter_number
      });

      const verseMap = verses
        .sort((a, b) => a.verse - b.verse)
        .reduce((acc, item) => {
          acc[item.verse] = item[textField];
          return acc;
        }, {});

      if (isMounted) {
        setInterlinearVerses(verseMap);
        setIsLoadingInterlinear(false);
      }
    };

    loadInterlinearChapter();

    return () => {
      isMounted = false;
    };
  }, [currentChapter?.book, currentChapter?.chapter_number, interlinearEnabled, entityName, effectiveSource, textField]);

  return {
    interlinearVerses,
    isLoadingInterlinear,
    effectiveSource,
    isOldTestament,
    isNewTestament,
    isRtlSource: isOldTestament
  };
}