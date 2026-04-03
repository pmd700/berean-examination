import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ content }) {
  // If content is HTML (contains tags like <p>, <img>), render as HTML
  if (content && (content.includes('<p>') || content.includes('<img') || content.includes('<h1') || content.includes('<h2') || content.includes('<h3') || content.includes('<details'))) {
    return (
      <React.Fragment>
        <style>{`
          .markdown-render .toggle-block {
            border-left: 2px solid #C46A2B;
            border-radius: 0 6px 6px 0;
            margin: 6px 0;
            background: rgba(196,106,43,0.04);
          }
          .dark .markdown-render .toggle-block {
            border-left-color: #D89160;
            background: rgba(196,106,43,0.06);
          }
          .markdown-render .toggle-block > summary {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            cursor: pointer;
            font-weight: 600;
            color: #2B1D12;
            list-style: none;
          }
          .dark .markdown-render .toggle-block > summary { color: #f3ede3; }
          .markdown-render .toggle-block > summary::-webkit-details-marker { display: none; }
          .markdown-render .toggle-block > summary::before {
            content: '▶';
            font-size: 9px;
            color: #C46A2B;
            flex-shrink: 0;
            transition: transform 0.18s ease;
            display: inline-block;
          }
          .dark .markdown-render .toggle-block > summary::before { color: #D89160; }
          .markdown-render .toggle-block[open] > summary::before { transform: rotate(90deg); }
          .markdown-render .toggle-block > div { padding: 4px 12px 6px 22px; }
          .markdown-render .toggle-block .toggle-block { margin-left: 4px; border-left-color: #A95622; }
        `}</style>
        <div 
          className="prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2 markdown-render"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </React.Fragment>
    );
  }

  // Otherwise render as Markdown
  return (
    <ReactMarkdown
      components={{
        h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white" {...props} />,
        p: ({node, ...props}) => <p className="mb-2 text-gray-700 dark:text-gray-300" {...props} />,
        a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 text-gray-700 dark:text-gray-300" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 text-gray-700 dark:text-gray-300" {...props} />,
        li: ({node, ...props}) => <li className="mb-1" {...props} />,
        code: ({node, inline, ...props}) => 
          inline 
            ? <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono" {...props} />
            : <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono overflow-x-auto" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic text-gray-600 dark:text-gray-400 mb-2" {...props} />,
        strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
        em: ({node, ...props}) => <em className="italic" {...props} />,
        img: ({node, ...props}) => <img className="max-w-full h-auto rounded-lg my-2" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}