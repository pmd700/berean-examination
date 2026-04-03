import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Map of recognized domains to their metadata
const RECOGNIZED_SITES = {
  'gotquestions.org': {
    name: 'GotQuestions',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/1fd4376bc_gotquestions.png'
  },
  'biblegateway.com': {
    name: 'BibleGateway',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/1d6bfb7eb_image.png'
  },
  'biblehub.com': {
    name: 'BibleHub',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/b5a5e140f_biblehub.png'
  },
  'enduringword.com': {
    name: 'Enduring Word',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/8e49bcebc_enduringword.png'
  },
  'logos.com': {
    name: 'Logos',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/e5e65696c_logos.png'
  }
};

// URL regex pattern that captures recognized domains
const URL_PATTERN = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]+(?:\/[^\s]*)?)/gi;

// Check if a URL belongs to a recognized site
function getRecognizedSite(url) {
  const normalized = url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  
  for (const [domain, metadata] of Object.entries(RECOGNIZED_SITES)) {
    if (normalized.startsWith(domain)) {
      return { domain, ...metadata };
    }
  }
  
  return null;
}

export const BibleSiteLink = Mark.create({
  name: 'bibleSiteLink',

  priority: 1001, // Higher than regular link

  addAttributes() {
    return {
      href: {
        default: null
      },
      site: {
        default: null
      },
      siteName: {
        default: null
      },
      siteLogo: {
        default: null
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a.bible-site-link',
        getAttrs: (dom) => ({
          href: dom.getAttribute('href'),
          site: dom.getAttribute('data-site'),
          siteName: dom.getAttribute('data-site-name'),
          siteLogo: dom.getAttribute('data-site-logo')
        })
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(
        {
          class: 'bible-site-link',
          'data-site': HTMLAttributes.site,
          'data-site-name': HTMLAttributes.siteName,
          'data-site-logo': HTMLAttributes.siteLogo,
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        HTMLAttributes
      ),
      0
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bibleSiteLinkAutoDetect'),
        
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            // Only process if document changed
            if (!tr.docChanged) return oldState;

            const decorations = [];
            const doc = tr.doc;

            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text;
                const matches = [...text.matchAll(URL_PATTERN)];

                matches.forEach((match) => {
                  const url = match[0];
                  const site = getRecognizedSite(url);

                  if (site) {
                    const from = pos + match.index;
                    const to = from + url.length;

                    // Check if already marked
                    let alreadyMarked = false;
                    doc.nodesBetween(from, to, (n) => {
                      if (n.marks.some(m => m.type.name === 'bibleSiteLink')) {
                        alreadyMarked = true;
                      }
                    });

                    if (!alreadyMarked) {
                      // Add decoration to trigger mark conversion
                      decorations.push(
                        Decoration.inline(from, to, {
                          class: 'bible-site-link-pending',
                          'data-url': url,
                          'data-site': site.domain,
                          'data-site-name': site.name,
                          'data-site-logo': site.logo
                        })
                      );
                    }
                  }
                });
              }
            });

            return DecorationSet.create(doc, decorations);
          }
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },

          handleDOMEvents: {
            input: (view, event) => {
              processLinks(view);
              return false;
            },
            paste: (view, event) => {
              // Process links after paste
              setTimeout(() => processLinks(view), 100);
              return false;
            }
          }
        }
      })
    ];
    
    // Shared function to process and convert links
    function processLinks(view) {
      setTimeout(() => {
        const { state, dispatch } = view;
        const { tr } = state;
        let modified = false;

        state.doc.descendants((node, pos) => {
          if (node.isText && node.text) {
            const text = node.text;
            // Reset lastIndex to ensure fresh matching
            URL_PATTERN.lastIndex = 0;
            const matches = [...text.matchAll(URL_PATTERN)];

            matches.forEach((match) => {
              const url = match[0];
              const site = getRecognizedSite(url);

              if (site) {
                const from = pos + match.index;
                const to = from + match[0].length;

                // Check if already marked
                let alreadyMarked = false;
                state.doc.nodesBetween(from, to, (n) => {
                  if (n.marks.some(m => m.type.name === 'bibleSiteLink')) {
                    alreadyMarked = true;
                  }
                });

                if (!alreadyMarked) {
                  // Ensure URL has protocol
                  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                  
                  const mark = state.schema.marks.bibleSiteLink.create({
                    href: fullUrl,
                    site: site.domain,
                    siteName: site.name,
                    siteLogo: site.logo
                  });

                  tr.addMark(from, to, mark);
                  modified = true;
                }
              }
            });
          }
        });

        if (modified) {
          dispatch(tr);
        }
      }, 50);
    }
    
    return [
      new Plugin({
        key: new PluginKey('bibleSiteLinkAutoDetect'),
        
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            // Only process if document changed
            if (!tr.docChanged) return oldState;

            const decorations = [];
            const doc = tr.doc;

            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text;
                const matches = [...text.matchAll(URL_PATTERN)];

                matches.forEach((match) => {
                  const url = match[0];
                  const site = getRecognizedSite(url);

                  if (site) {
                    const from = pos + match.index;
                    const to = from + url.length;

                    // Check if already marked
                    let alreadyMarked = false;
                    doc.nodesBetween(from, to, (n) => {
                      if (n.marks.some(m => m.type.name === 'bibleSiteLink')) {
                        alreadyMarked = true;
                      }
                    });

                    if (!alreadyMarked) {
                      // Add decoration to trigger mark conversion
                      decorations.push(
                        Decoration.inline(from, to, {
                          class: 'bible-site-link-pending',
                          'data-url': url,
                          'data-site': site.domain,
                          'data-site-name': site.name,
                          'data-site-logo': site.logo
                        })
                      );
                    }
                  }
                });
              }
            });

            return DecorationSet.create(doc, decorations);
          }
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },

          handleDOMEvents: {
            input: (view, event) => {
              processLinks(view);
              return false;
            },
            paste: (view, event) => {
              // Process links after paste
              setTimeout(() => processLinks(view), 100);
              return false;
            }
          }
        }
      })
    ];
  }
});