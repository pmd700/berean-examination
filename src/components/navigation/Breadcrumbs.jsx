import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <li>
          <a
            href={createPageUrl('KeyEntry')}
            className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only">Home</span>
          </a>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <React.Fragment key={index}>
              <li aria-hidden="true">
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
              </li>
              <li>
                {isLast ? (
                  <span className="font-medium text-gray-900 dark:text-white" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}