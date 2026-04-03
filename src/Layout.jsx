import React, { useState, useEffect } from 'react';
import GlobalNav from './components/navigation/GlobalNav';
import UpdatePopup from './components/updates/UpdatePopup';
import GlobalSearch from './components/search/GlobalSearch';
import { base44 } from '@/api/base44Client';

export default function Layout({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(!!user?.is_admin || user?.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  return (
    <div className="min-h-screen">
      <style>{`
        :root {
          /* Rustic Biblical Study Palette */
          --rustic-50: #FDF8F0;
          --rustic-100: #F9F1DE;
          --rustic-200: #F2D3B3;
          --rustic-300: #E8BA8A;
          --rustic-400: #D89160;
          --rustic-500: #C46A2B;
          --rustic-600: #A95622;
          --rustic-700: #8A451B;
          --rustic-800: #6B3416;
          --rustic-900: #4D2510;
          --rustic-950: #2B1D12;
          
          /* Semantic colors */
          --bg-parchment: #F5EAD3;
          --surface-sand: #EAD9B6;
          --surface-elevated: #F9F1DE;
          --text-walnut: #2B1D12;
          --text-cocoa: #5A3E2B;
          --text-muted: #7B6656;
          --border-wheat: #D7C29A;
          --accent-orange: #C46A2B;
          --accent-hover: #A95622;
          --accent-subtle: #F2D3B3;
          --link-ink: #7A3F1D;
          --success-olive: #4F6B3A;
          --warning-amber: #D18B2C;
          --error-brick: #9B3D2B;
          --focus-gold: #D6A34A;
        }
        
        .dark {
          color-scheme: dark;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .font-serif {
          font-family: 'Georgia', 'Times New Roman', serif;
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        
        .dark ::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        .dark ::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        
        /* Rich text editor customizations */
        .ql-toolbar.ql-snow {
          border-radius: 8px 8px 0 0;
          border-color: #e5e7eb;
        }
        
        .ql-container.ql-snow {
          border-radius: 0 0 8px 8px;
          border-color: #e5e7eb;
        }
        
        .dark .ql-toolbar.ql-snow,
        .dark .ql-container.ql-snow {
          border-color: #374151;
        }
        
        /* Selection highlight */
        ::selection {
          background-color: rgba(196, 106, 43, 0.3);
        }

        /* Enable text selection for verse content */
        .verse-content-container {
          user-select: text;
          -webkit-user-select: text;
        }

        /* Make verse number badges non-selectable */
        .verse-number-badge {
          user-select: none;
          -webkit-user-select: none;
        }

        /* Marker-style highlight wrapper */
        .markerSelection {
          background: rgba(196, 106, 43, 0.28);
          border-radius: 14px;
          padding: 2px 3px;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
      `}</style>
      {children}
      <GlobalSearch />
      <GlobalNav isAdmin={isAdmin} />
      <UpdatePopup />
    </div>
  );
}