import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, FileText } from 'lucide-react';

export default function SourceLicenseSection({ section }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{section.title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
      </div>

      <div className="space-y-3">
        {section.items.map((item) => (
          <details
            key={item.name}
            className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 open:shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.usage}</p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {item.license}
              </span>
            </summary>

            <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{item.attribution}</p>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                  >
                    <ExternalLink className="w-4 h-4" /> Source
                  </a>
                )}
                {item.licenseUrl && (
                  <a
                    href={item.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                  >
                    <FileText className="w-4 h-4" /> License / permissions
                  </a>
                )}
              </div>

              {item.documents?.length > 0 && (
                <div className="mt-5 space-y-3">
                  {item.documents.map((doc) => (
                    <details
                      key={doc.title}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950/50"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                        <FileText className="w-4 h-4" />
                        {doc.label}
                      </summary>
                      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4">
                        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{doc.title}</h4>
                        <div className="max-h-96 overflow-y-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
                          {doc.format === 'markdown' ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mb-3 prose-p:my-2 prose-li:my-1">
                              <ReactMarkdown>{doc.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                              {doc.content}
                            </pre>
                          )}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}