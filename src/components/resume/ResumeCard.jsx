import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, X, BookOpen, Tag, MessageSquare,
  Shield, Image, Settings, Users, UserPlus, Ban, Megaphone, Network } from
'lucide-react';
import { createPageUrl } from '@/utils';
import { getLastActivity, buildActivityUrl } from '../utils/activityTracker';

const ICON_MAP = {
  study: BookOpen,
  keyword: Tag,
  social: MessageSquare,
  admin: Shield,
  chapter_art: Image,
  account: Settings,
  friends: Users,
  requests: UserPlus,
  blocked: Ban,
  updates: Megaphone,
  knowledge_web: Network
};

function getIcon(activity) {
  if (!activity) return BookOpen;
  const hint = activity.icon || activity.type || '';
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (hint.includes(key)) return Icon;
  }
  return BookOpen;
}

export default function ResumeCard({ user }) {
  const [visible, setVisible] = useState(false);
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    if (!user) return;
    const act = getLastActivity(user);
    if (!act) return;

    // Don't show admin activities to non-admin users
    if (act.admin_only && !user.is_admin) return;

    // Don't show if activity is the current page
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const actUrl = buildActivityUrl(act, createPageUrl);
    if (actUrl) {
      try {
        const actUrlObj = new URL(actUrl, window.location.origin);
        if (actUrlObj.pathname === currentPath && actUrlObj.search === currentSearch) return;
      } catch {/* ignore */}
    }

    // Don't show if activity is too old (> 7 days)
    if (act.timestamp) {
      const age = Date.now() - new Date(act.timestamp).getTime();
      if (age > 7 * 24 * 60 * 60 * 1000) return;
    }

    setActivity(act);
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [user]);

  if (!visible || !activity) return null;

  const Icon = getIcon(activity);
  const resumeUrl = buildActivityUrl(activity, createPageUrl);

  return (
    <div className="fixed top-24 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-br from-stone-800 to-amber-900 border-2 border-amber-600/50 rounded-xl shadow-2xl p-4 max-w-sm relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-amber-500/5 to-transparent" />
        
        <div className="flex items-start gap-3 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-amber-300" />
              <span className="text-sm text-amber-100">{activity.title}</span>
            </div>
            {activity.subtitle &&
            <div className="text-slate-50 mb-3 text-base font-semibold">
                {activity.subtitle}
              </div>
            }
            {!activity.subtitle && <div className="mb-1" />}
            <Button
              onClick={() => {
                if (resumeUrl) window.location.href = resumeUrl;
              }}
              size="sm"
              className="h-8 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs shadow-md">

              Resume
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-amber-300 hover:text-amber-100 transition-colors p-1">

            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>);

}