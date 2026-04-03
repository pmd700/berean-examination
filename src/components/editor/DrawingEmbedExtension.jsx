import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Edit } from 'lucide-react';

const DrawingEmbedComponent = ({ node, deleteNode, editor }) => {
  const { drawingId, previewSrc, paperMode } = node.attrs;

  const handleClick = () => {
    // Dispatch custom event to open drawing editor
    const event = new CustomEvent('openDrawingEditor', {
      detail: { drawingId }
    });
    window.dispatchEvent(event);
  };

  return (
    <NodeViewWrapper className="drawing-embed-wrapper">
      <div
        onClick={handleClick}
        className="drawing-embed inline-block cursor-pointer group my-2 mr-2"
        contentEditable={false}
      >
        <div className="relative rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden hover:border-purple-300 dark:hover:border-purple-600 transition-all hover:shadow-md">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Drawing preview"
              className="max-w-xs max-h-32 object-contain bg-white dark:bg-gray-800"
              style={{ display: 'block' }}
            />
          ) : (
            <div className="w-32 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="text-gray-400 text-sm">Loading...</div>
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
              <Edit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
          Click to edit
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const DrawingEmbed = Node.create({
  name: 'drawingEmbed',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      drawingId: {
        default: null,
        parseHTML: element => element.getAttribute('data-drawing-id'),
        renderHTML: attributes => {
          if (!attributes.drawingId) return {};
          return { 'data-drawing-id': attributes.drawingId };
        },
      },
      previewSrc: {
        default: null,
        parseHTML: element => element.getAttribute('data-preview-src'),
        renderHTML: attributes => {
          if (!attributes.previewSrc) return {};
          return { 'data-preview-src': attributes.previewSrc };
        },
      },
      paperMode: {
        default: 'light',
        parseHTML: element => element.getAttribute('data-paper-mode') || 'light',
        renderHTML: attributes => {
          return { 'data-paper-mode': attributes.paperMode };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-drawing-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'drawing-embed' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingEmbedComponent);
  },
});