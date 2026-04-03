import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function VerseBibleHubButton({ href, verseNumber, className = '' }) {
  const badgeClassName = `verse-number-badge relative inline-flex items-center justify-center ${className}`;

  if (!href) {
    return <span className={badgeClassName}>{verseNumber}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${badgeClassName} w-10 hover:w-14 shrink-0 overflow-hidden px-0 transition-[width,color] duration-200 hover:text-orange-800 dark:hover:text-orange-200`}
      title={`Open Bible Hub commentary for verse ${verseNumber}`}
      aria-label={`Open Bible Hub commentary for verse ${verseNumber}`}
    >
      <span className="absolute left-1/2 -translate-x-1/2 transition-transform duration-200 group-hover:-translate-x-[0.55rem]">{verseNumber}</span>
      <ExternalLink strokeWidth={1.5} className="pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </a>
  );
}