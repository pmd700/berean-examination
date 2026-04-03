import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import { ImageUpload } from './ImageUploadExtension';
import ImageLightbox from './ImageLightbox';
import { Details } from '@tiptap/extension-details';
import { DetailsSummary } from '@tiptap/extension-details-summary';
import { DetailsContent } from '@tiptap/extension-details-content';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Code, Quote, 
  Heading1, Heading2, Heading3, Minus, Link as LinkIcon, ExternalLink, Search, X,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeywordLink } from './KeywordLinkExtension';
import { BibleSiteLink } from './BibleSiteLinkExtension';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function RichTextEditor({ content, onChange, placeholder = "Write your commentary...", onUploadingChange, onEditorReady }) {
  const [showKeywordPicker, setShowKeywordPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [suppressBubbleMenu, setSuppressBubbleMenu] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [keywordSearch, setKeywordSearch] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [uploadsInProgress, setUploadsInProgress] = useState(0);

  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = async () => {
    try {
      const kws = await base44.entities.Keyword.list('title');
      setKeywords(kws);
    } catch (e) {
      console.error('Failed to load keywords:', e);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          exitOnEnter: true
        },
        hardBreak: false
      }),
      Placeholder.configure({
        placeholder
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'external-link',
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Details.configure({
        persist: true,
        HTMLAttributes: { class: 'toggle-block' },
      }),
      DetailsSummary,
      DetailsContent,
      ImageUpload,
      KeywordLink,
      BibleSiteLink
    ],
    content,
    onUpdate: ({ editor }) => {
      // Store as HTML not Markdown (Markdown doesn't reliably serialize images)
      const html = editor.getHTML();
      
      // DEBUG: Log updates with images
      if (html.includes('<img')) {
        console.log('✏️ EDITOR UPDATE - Content now has images:', html.substring(0, 200));
      }
      
      onChange(html);
      // Clear suppression on any content change
      setSuppressBubbleMenu(false);
      
      // Track uploads in progress
      const uploading = editor.storage.imageUpload?.uploadsInProgress || 0;
      setUploadsInProgress(uploading);
      if (onUploadingChange) {
        onUploadingChange(uploading > 0);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] px-3 py-2'
      }
    },
    onCreate: ({ editor }) => {
      if (onEditorReady) {
        onEditorReady(editor);
      }
    }
  });

  // Clear bubble menu suppression when selection changes
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      // Only clear suppression if pickers are closed
      if (!showKeywordPicker && !showLinkInput) {
        setSuppressBubbleMenu(false);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, showKeywordPicker, showLinkInput]);

  React.useEffect(() => {
    if (!editor) return;
    
    const currentContent = editor.getHTML();
    if (content === currentContent) return;

    // Don't update if user is actively editing
    if (editor.isFocused) return;

    // DEBUG: Log content being loaded
    if (content && content.includes('<img')) {
      console.log('📝 LOADING INTO EDITOR - Content with images:', content.substring(0, 200));
    }

    try {
      // Use transaction to safely update content
      editor.commands.setContent(content || '', false);
    } catch (error) {
      console.error('Editor content update error:', error);
      // If error, try clearing first as fallback
      try {
        editor.commands.clearContent();
        if (content) {
          setTimeout(() => {
            editor.commands.setContent(content);
          }, 0);
        }
      } catch (e) {
        console.error('Failed to recover from content update error:', e);
      }
    }
  }, [content, editor]);

  // Make external links clickable and images open in lightbox
  React.useEffect(() => {
    if (!editor) return;

    const handleClick = (e) => {
      const keywordLink = e.target.closest('[data-keyword-id]');
      if (keywordLink) {
        e.preventDefault();
        const keywordId = keywordLink.getAttribute('data-keyword-id');
        if (keywordId) {
          window.location.href = `${createPageUrl('Keywords')}?keyword_id=${encodeURIComponent(keywordId)}`;
        }
        return;
      }

      const link = e.target.closest('a.external-link');
      if (link && link.href) {
        e.preventDefault();
        window.open(link.href, '_blank', 'noopener,noreferrer');
        return;
      }

      const image = e.target.closest('img[src]');
      if (image && !image.closest('[data-uploading]')) {
        e.preventDefault();
        setLightboxImage({
          src: image.src,
          alt: image.alt || 'Image'
        });
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('click', handleClick);

    return () => {
      editorElement.removeEventListener('click', handleClick);
    };
  }, [editor]);



  const handleLinkKeyword = (keyword) => {
    editor.chain().focus().setKeywordLink({
      keywordId: keyword.id,
      keywordTitle: keyword.title,
    }).run();
    setShowKeywordPicker(false);
    setKeywordSearch('');
    // Keep bubble menu suppressed until next selection
    setSuppressBubbleMenu(true);
  };

  const handleSetLink = () => {
    if (!linkUrl) return;
    
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().setLink({ href: url }).run();
    setShowLinkInput(false);
    setLinkUrl('');
    setSuppressBubbleMenu(true);
  };

  const handleUnsetLink = () => {
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const filteredKeywords = keywords.filter(k =>
    k.title.toLowerCase().includes(keywordSearch.toLowerCase()) ||
    (k.category || '').toLowerCase().includes(keywordSearch.toLowerCase())
  );

  const handleBubbleMenuAction = (action) => {
    action();
    setSuppressBubbleMenu(true);
  };

  const handleHeadingToggle = (level) => {
    // Get current selection range
    const { from, to } = editor.state.selection;
    
    // Find the block node containing the selection
    const $from = editor.state.doc.resolve(from);
    const blockStart = $from.start($from.depth);
    const blockEnd = $from.end($from.depth);
    
    // Apply heading to the entire block only
    editor.chain()
      .focus()
      .setTextSelection({ from: blockStart, to: blockEnd })
      .toggleHeading({ level })
      .focus()
      .setTextSelection(from) // Restore cursor position
      .run();
    
    setSuppressBubbleMenu(true);
  };

  if (!editor) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 relative">
      <BubbleMenu 
        editor={editor}
        shouldShow={({ editor }) => {
          // Hide if any picker is open or suppressed
          if (showKeywordPicker || showLinkInput || suppressBubbleMenu) return false;
          // Show only if there's a selection
          return editor.view.state.selection.content().size > 0;
        }}
        tippyOptions={{ 
          duration: 100,
          placement: 'top',
          maxWidth: 'none'
        }}
        className="bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-full px-2 py-1.5 shadow-2xl flex gap-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().toggleBold().run())}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('bold') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().toggleItalic().run())}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('italic') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().toggleUnderline().run())}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('underline') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Underline (Ctrl/Cmd+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-5 bg-gray-700 self-center" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleHeadingToggle(1)}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('heading', { level: 1 }) ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleHeadingToggle(2)}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('heading', { level: 2 }) ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleHeadingToggle(3)}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('heading', { level: 3 }) ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-5 bg-gray-700 self-center" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().toggleBulletList().run())}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('bulletList') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().toggleOrderedList().run())}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('orderedList') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-5 bg-gray-700 self-center" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().toggleCodeBlock().run())}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('codeBlock') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Code Block"
        >
          <Code className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().toggleBlockquote().run())}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('blockquote') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Blockquote"
        >
          <Quote className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().setHorizontalRule().run())}
          className="h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white"
          title="Horizontal Rule"
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleBubbleMenuAction(() => editor.chain().focus().setDetails().run())}
          className={`h-7 px-1.5 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white text-[10px] font-semibold flex items-center gap-0.5 ${editor.isActive('details') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Toggle / Collapsible Block (▶ Title + hidden body)"
        >
          <ChevronRight className="w-3 h-3" />
          <span>Toggle</span>
        </Button>
        <div className="w-px h-5 bg-gray-700 self-center" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href || '';
            setLinkUrl(previousUrl);
            editor.commands.setTextSelection(editor.state.selection.to);
            editor.commands.blur();
            setSuppressBubbleMenu(true);
            setTimeout(() => setShowLinkInput(!showLinkInput), 0);
          }}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${editor.isActive('link') ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Add Link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.commands.setTextSelection(editor.state.selection.to);
            editor.commands.blur();
            setSuppressBubbleMenu(true);
            setTimeout(() => setShowKeywordPicker(!showKeywordPicker), 0);
          }}
          className={`h-7 w-7 p-0 rounded-full hover:bg-orange-600/20 hover:text-orange-400 text-white ${showKeywordPicker ? 'bg-orange-600/30 text-orange-300' : ''}`}
          title="Link Keyword"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </Button>
      </BubbleMenu>

      {showLinkInput && (
        <div className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl w-96 overflow-hidden"
             style={{ 
               top: '50%', 
               left: '50%', 
               transform: 'translate(-50%, -50%)'
             }}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink className="w-4 h-4 text-gray-400" />
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSetLink();
                  }
                }}
                placeholder="https://example.com"
                className="flex-1 dark:bg-gray-800"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSetLink}
                disabled={!linkUrl}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                Set Link
              </Button>
              {editor.isActive('link') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnsetLink}
                  className="flex-1"
                >
                  Remove Link
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl('');
                  setSuppressBubbleMenu(true);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {showKeywordPicker && (
        <div className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl w-80 max-h-96 overflow-hidden"
             style={{ 
               top: '50%', 
               left: '50%', 
               transform: 'translate(-50%, -50%)'
             }}>
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              placeholder="Search keywords..."
              className="border-0 focus-visible:ring-0 p-0 h-8 dark:bg-gray-800"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => {
                setShowKeywordPicker(false);
                setKeywordSearch('');
                setSuppressBubbleMenu(true);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {filteredKeywords.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No keywords found
              </div>
            ) : (
              filteredKeywords.map((keyword) => (
                <button
                  key={keyword.id}
                  onClick={() => handleLinkKeyword(keyword)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {keyword.title}
                  </div>
                  {keyword.category && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                      {keyword.category}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <EditorContent editor={editor} />

      {uploadsInProgress > 0 && (
        <div className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          Uploading {uploadsInProgress} image{uploadsInProgress > 1 ? 's' : ''}… Please wait before saving.
        </div>
      )}

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror {
          min-height: 150px;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror code {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875em;
        }
        .dark .ProseMirror code {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .ProseMirror pre {
          background-color: #1e1e1e;
          color: #d4d4d4;
          padding: 0.75rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: monospace;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #C46A2B;
          padding-left: 1rem;
          margin-left: 0;
          color: #6b7280;
        }
        .dark .ProseMirror blockquote {
          color: #9ca3af;
        }
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1rem 0;
        }
        .dark .ProseMirror hr {
          border-top-color: #374151;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror li {
          margin: 0.25rem 0;
        }
        .ProseMirror .keyword-link {
          color: #C46A2B;
          text-decoration: underline;
          cursor: pointer;
          position: relative;
        }
        .dark .ProseMirror .keyword-link {
          color: #D89160;
        }
        .ProseMirror .keyword-link:hover {
          color: #A95622;
        }
        .dark .ProseMirror .keyword-link:hover {
          color: #F2D3B3;
        }
        .ProseMirror u {
          text-decoration: underline;
        }
        .ProseMirror .external-link {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        .dark .ProseMirror .external-link {
          color: #60a5fa;
        }
        .ProseMirror .external-link:hover {
          color: #1d4ed8;
        }
        .dark .ProseMirror .external-link:hover {
          color: #93c5fd;
        }
        
        /* Bible Site Links - Rustic Orange with badges */
        .ProseMirror .bible-site-link {
          color: #C46A2B !important;
          text-decoration: none;
          cursor: pointer;
          position: relative;
          padding-right: 24px;
          transition: all 0.8s ease;
          animation: bibleSiteLinkFadeIn 0.8s ease;
        }
        .dark .ProseMirror .bible-site-link {
          color: #D89160 !important;
        }
        .ProseMirror .bible-site-link:hover {
          color: #A95622 !important;
          text-decoration: underline;
        }
        .dark .ProseMirror .bible-site-link:hover {
          color: #F2D3B3 !important;
        }
        
        /* Logo badge - larger and more visible */
        .ProseMirror .bible-site-link::after {
          content: '';
          display: inline-block;
          width: 22px;
          height: 22px;
          background-image: attr(data-site-logo);
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          margin-left: 4px;
          vertical-align: super;
          position: relative;
          top: -4px;
          opacity: 0;
          animation: bibleSiteBadgeFadeIn 0.8s ease 0.2s forwards;
        }
        
        /* Specific logo backgrounds for each site */
        .ProseMirror .bible-site-link[data-site="gotquestions.org"]::after {
          background-image: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/1fd4376bc_gotquestions.png');
        }
        .ProseMirror .bible-site-link[data-site="biblegateway.com"]::after {
          background-image: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/1d6bfb7eb_image.png');
          width: 18px;
          height: 18px;
        }
        .ProseMirror .bible-site-link[data-site="biblehub.com"]::after {
          background-image: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/b5a5e140f_biblehub.png');
        }
        .ProseMirror .bible-site-link[data-site="enduringword.com"]::after {
          background-image: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/8e49bcebc_enduringword.png');
        }
        .ProseMirror .bible-site-link[data-site="logos.com"]::after {
          background-image: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/e5e65696c_logos.png');
        }
        
        @keyframes bibleSiteLinkFadeIn {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bibleSiteBadgeFadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 0.95;
            transform: scale(1);
          }
        }

        /* Image Upload Styles */
        .ProseMirror .image-upload-node {
          margin: 1rem 0;
          display: block;
        }

        .ProseMirror .uploaded-image {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.3s ease;
        }

        .ProseMirror .uploaded-image:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(196, 106, 43, 0.2);
        }

        .dark .ProseMirror .uploaded-image {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .dark .ProseMirror .uploaded-image:hover {
          box-shadow: 0 4px 12px rgba(196, 106, 43, 0.3);
        }

        /* Premium Upload Placeholder */
        .ProseMirror .image-upload-placeholder {
          position: relative;
          width: 100%;
          max-width: 600px;
          height: 200px;
          border: 2px dashed rgba(196, 106, 43, 0.3);
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(245, 234, 211, 0.3), rgba(234, 217, 182, 0.3));
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dark .ProseMirror .image-upload-placeholder {
          background: linear-gradient(135deg, rgba(75, 52, 36, 0.3), rgba(58, 42, 30, 0.3));
          border-color: rgba(196, 106, 43, 0.4);
        }

        .ProseMirror .placeholder-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.15) 25%,
            rgba(255, 248, 220, 0.25) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 100%
          );
          animation: shimmer 1.4s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .ProseMirror .placeholder-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .ProseMirror .upload-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(196, 106, 43, 0.2);
          border-top-color: rgb(196, 106, 43);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .ProseMirror .upload-label {
          font-size: 14px;
          font-weight: 500;
          color: rgb(196, 106, 43);
          letter-spacing: 0.5px;
        }

        .dark .ProseMirror .upload-label {
          color: rgb(216, 145, 96);
        }

        /* Upload Error State */
        .ProseMirror .image-upload-error {
          padding: 24px;
          border: 2px solid rgba(155, 61, 43, 0.4);
          border-radius: 12px;
          background: rgba(251, 242, 241, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          max-width: 400px;
        }

        .dark .ProseMirror .image-upload-error {
          background: rgba(75, 30, 25, 0.3);
          border-color: rgba(155, 61, 43, 0.5);
        }

        .ProseMirror .error-icon {
          width: 32px;
          height: 32px;
          color: rgb(155, 61, 43);
          stroke-width: 2;
        }

        .dark .ProseMirror .error-icon {
          color: rgb(220, 100, 80);
        }

        .ProseMirror .image-upload-error span {
          font-size: 14px;
          font-weight: 500;
          color: rgb(155, 61, 43);
        }

        .dark .ProseMirror .image-upload-error span {
          color: rgb(220, 100, 80);
        }

        .ProseMirror .retry-button {
          padding: 6px 16px;
          border-radius: 6px;
          background: rgb(196, 106, 43);
          color: white;
          font-size: 13px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .ProseMirror .retry-button:hover {
          background: rgb(169, 86, 34);
        }

        /* ── Toggle / Details blocks ── */
        .ProseMirror .toggle-block {
          border-left: 2px solid #C46A2B;
          border-radius: 0 6px 6px 0;
          margin: 6px 0;
          background: rgba(196, 106, 43, 0.04);
        }
        .dark .ProseMirror .toggle-block {
          border-left-color: #D89160;
          background: rgba(196, 106, 43, 0.06);
        }
        .ProseMirror .toggle-block > summary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 600;
          color: #2B1D12;
          list-style: none;
          border-radius: 0 6px 6px 0;
          user-select: text;
        }
        .ProseMirror .toggle-block > summary::-webkit-details-marker { display: none; }
        .dark .ProseMirror .toggle-block > summary {
          color: #f3ede3;
        }
        .ProseMirror .toggle-block > summary::before {
          content: '▶';
          font-size: 9px;
          color: #C46A2B;
          flex-shrink: 0;
          transition: transform 0.18s ease;
          display: inline-block;
        }
        .dark .ProseMirror .toggle-block > summary::before {
          color: #D89160;
        }
        .ProseMirror .toggle-block[open] > summary::before {
          transform: rotate(90deg);
        }
        .ProseMirror .toggle-block > div[data-details-content] {
          padding: 4px 12px 6px 22px;
        }
        /* Nested toggles */
        .ProseMirror .toggle-block .toggle-block {
          margin-left: 4px;
          border-left-color: #A95622;
          background: rgba(196,106,43,0.03);
        }
        .dark .ProseMirror .toggle-block .toggle-block {
          border-left-color: #C46A2B;
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .ProseMirror .placeholder-shimmer {
            animation: none;
            display: none;
          }
          
          .ProseMirror .upload-spinner {
            animation: none;
            border-top-color: rgb(196, 106, 43);
            opacity: 0.7;
          }

          .ProseMirror .uploaded-image {
            transition: none;
          }

          .ProseMirror .uploaded-image:hover {
            transform: none;
          }
        }

        /* Responsive images on mobile */
        @media (max-width: 640px) {
          .ProseMirror .uploaded-image,
          .ProseMirror .image-upload-placeholder {
            border-radius: 6px;
          }

          .ProseMirror .image-upload-placeholder {
            height: 160px;
          }
        }
      `}</style>
    </div>
  );
}