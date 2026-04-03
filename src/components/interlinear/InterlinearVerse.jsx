import React from 'react';

const HEBREW_REGEX = /[\u0590-\u05FF]/;

export default function InterlinearVerse({ verseText, greekText, isRtl = false }) {
  const content = verseText || greekText;
  if (!content) return null;

  const hasHebrew = HEBREW_REGEX.test(content);
  const rtl = isRtl || hasHebrew;

  return (
    <div className="ml-[3.25rem] mt-3 mb-2 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 px-4 py-3.5 sm:px-5 sm:py-4">
      <p
        dir={rtl ? 'rtl' : 'ltr'}
        lang={rtl ? 'he' : 'el'}
        style={{
          fontFamily: rtl
            ? 'var(--interlinear-hebrew-font, Georgia, serif)'
            : 'var(--interlinear-greek-font, Georgia, serif)'
        }}
        className={`text-gray-700 dark:text-gray-200 ${rtl ? 'text-right text-lg sm:text-xl leading-[2.15] tracking-[0.01em]' : 'text-left text-base sm:text-[1.05rem] leading-8'}`}
      >
        {content}
      </p>
    </div>
  );
}