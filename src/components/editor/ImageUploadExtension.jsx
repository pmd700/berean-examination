import { Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

export const ImageUpload = Node.create({
  name: 'imageUpload',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      uploading: {
        default: false,
      },
      error: {
        default: null,
      },
      uploadId: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (dom) => ({
          src: dom.getAttribute('src'),
          alt: dom.getAttribute('alt'),
          title: dom.getAttribute('title'),
          width: dom.getAttribute('width'),
          height: dom.getAttribute('height'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { uploading, error, uploadId, ...attrs } = HTMLAttributes;
    
    // Don't render placeholders/errors to final HTML/markdown
    if (uploading || error || !attrs.src) {
      return ['span', {}];
    }
    
    // Only render real images with src
    return ['img', {
      src: attrs.src,
      alt: attrs.alt || '',
      title: attrs.title || undefined,
      width: attrs.width || undefined,
      height: attrs.height || undefined,
    }];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'image-upload-node';

      if (node.attrs.uploading) {
        dom.innerHTML = `
          <div class="image-upload-placeholder">
            <div class="placeholder-shimmer"></div>
            <div class="placeholder-content">
              <div class="upload-spinner"></div>
              <span class="upload-label">Uploading…</span>
            </div>
          </div>
        `;
        return { dom };
      }

      if (node.attrs.error) {
        dom.innerHTML = `
          <div class="image-upload-error">
            <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Upload failed</span>
          </div>
        `;
        return { dom };
      }

      if (node.attrs.src) {
        const img = document.createElement('img');
        img.src = node.attrs.src;
        if (node.attrs.alt) img.alt = node.attrs.alt;
        if (node.attrs.title) img.title = node.attrs.title;
        if (node.attrs.width) img.width = node.attrs.width;
        if (node.attrs.height) img.height = node.attrs.height;
        img.className = 'uploaded-image';
        dom.appendChild(img);
      }

      return { dom };
    };
  },

  addCommands() {
    return {
      setImage: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },

  onCreate() {
    if (!this.editor.storage.imageUpload) {
      this.editor.storage.imageUpload = {
        uploadsInProgress: 0,
      };
    }
  },

  addProseMirrorPlugins() {
    const uploadImage = async (file, editor) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Image too large. Max size is 10MB.');
        return null;
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Invalid file type. Only PNG, JPG, GIF, and WebP are supported.');
        return null;
      }

      try {
        // Import base44 dynamically
        const { base44 } = await import('@/api/base44Client');
        
        // Upload file
        const response = await base44.integrations.Core.UploadFile({ file });
        return response.file_url;
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error('Failed to upload image. Please try again.');
        return null;
      }
    };

    return [
      new Plugin({
        key: new PluginKey('imageUpload'),
        props: {
          handlePaste(view, event) {
            const items = Array.from(event.clipboardData?.items || []);
            const imageItems = items.filter(item => item.type.startsWith('image/'));

            if (imageItems.length === 0) return false;

            event.preventDefault();

            imageItems.forEach(async (item) => {
              const file = item.getAsFile();
              if (!file) return;

              const { state } = view;
              const { selection } = state;
              const position = selection.$anchor.pos;

              // Generate unique upload ID
              const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              // Insert placeholder with unique ID
              const placeholderNode = state.schema.nodes.imageUpload.create({
                uploading: true,
                uploadId,
                alt: 'Uploading...',
              });

              const transaction = state.tr.insert(position, placeholderNode);
              view.dispatch(transaction);

              // Track upload in progress
              if (this.editor?.storage?.imageUpload) {
                this.editor.storage.imageUpload.uploadsInProgress++;
              }

              // Upload image
              const url = await uploadImage(file, this.editor);

              if (url) {
                // Replace placeholder with actual image
                const { state: newState } = view;
                let placeholderPos = -1;

                newState.doc.descendants((node, pos) => {
                  if (node.type.name === 'imageUpload' && node.attrs.uploadId === uploadId) {
                    placeholderPos = pos;
                    return false;
                  }
                });

                if (placeholderPos !== -1) {
                  const imageNode = newState.schema.nodes.imageUpload.create({
                    src: url,
                    alt: file.name,
                    uploading: false,
                    uploadId: null,
                  });

                  const tr = newState.tr.replaceWith(
                    placeholderPos,
                    placeholderPos + 1,
                    imageNode
                  );
                  view.dispatch(tr);
                }
                
                // Mark upload complete
                if (this.editor?.storage?.imageUpload) {
                  this.editor.storage.imageUpload.uploadsInProgress--;
                }
              } else {
                // Show error state instead of removing
                const { state: newState } = view;
                let placeholderPos = -1;

                newState.doc.descendants((node, pos) => {
                  if (node.type.name === 'imageUpload' && node.attrs.uploadId === uploadId) {
                    placeholderPos = pos;
                    return false;
                  }
                });

                if (placeholderPos !== -1) {
                  const errorNode = newState.schema.nodes.imageUpload.create({
                    error: 'Upload failed. Please try again.',
                    uploadId,
                    uploading: false,
                  });

                  const tr = newState.tr.replaceWith(
                    placeholderPos,
                    placeholderPos + 1,
                    errorNode
                  );
                  view.dispatch(tr);
                }
                
                // Mark upload complete (even on error)
                if (this.editor?.storage?.imageUpload) {
                  this.editor.storage.imageUpload.uploadsInProgress--;
                }
              }
            });

            return true;
          },

          handleDrop(view, event) {
            const files = Array.from(event.dataTransfer?.files || []);
            const imageFiles = files.filter(file => file.type.startsWith('image/'));

            if (imageFiles.length === 0) return false;

            event.preventDefault();

            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });

            if (!coordinates) return true;

            imageFiles.forEach(async (file) => {
              const { state } = view;
              const position = coordinates.pos;

              // Generate unique upload ID
              const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              // Insert placeholder with unique ID
              const placeholderNode = state.schema.nodes.imageUpload.create({
                uploading: true,
                uploadId,
                alt: 'Uploading...',
              });

              const transaction = state.tr.insert(position, placeholderNode);
              view.dispatch(transaction);

              // Track upload in progress
              if (this.editor?.storage?.imageUpload) {
                this.editor.storage.imageUpload.uploadsInProgress++;
              }

              // Upload image
              const url = await uploadImage(file, this.editor);

              if (url) {
                // Replace placeholder with actual image
                const { state: newState } = view;
                let placeholderPos = -1;

                newState.doc.descendants((node, pos) => {
                  if (node.type.name === 'imageUpload' && node.attrs.uploadId === uploadId) {
                    placeholderPos = pos;
                    return false;
                  }
                });

                if (placeholderPos !== -1) {
                  const imageNode = newState.schema.nodes.imageUpload.create({
                    src: url,
                    alt: file.name,
                    uploading: false,
                    uploadId: null,
                  });

                  const tr = newState.tr.replaceWith(
                    placeholderPos,
                    placeholderPos + 1,
                    imageNode
                  );
                  view.dispatch(tr);
                }
                
                // Mark upload complete
                if (this.editor?.storage?.imageUpload) {
                  this.editor.storage.imageUpload.uploadsInProgress--;
                }
              } else {
                // Show error state instead of removing
                const { state: newState } = view;
                let placeholderPos = -1;

                newState.doc.descendants((node, pos) => {
                  if (node.type.name === 'imageUpload' && node.attrs.uploadId === uploadId) {
                    placeholderPos = pos;
                    return false;
                  }
                });

                if (placeholderPos !== -1) {
                  const errorNode = newState.schema.nodes.imageUpload.create({
                    error: 'Upload failed. Please try again.',
                    uploadId,
                    uploading: false,
                  });

                  const tr = newState.tr.replaceWith(
                    placeholderPos,
                    placeholderPos + 1,
                    errorNode
                  );
                  view.dispatch(tr);
                }
                
                // Mark upload complete (even on error)
                if (this.editor?.storage?.imageUpload) {
                  this.editor.storage.imageUpload.uploadsInProgress--;
                }
              }
            });

            return true;
          },
        },
      }),
    ];
  },
});