import React from 'react';

const WHEEL_IMAGE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/d73dc4a7a_loadingwheelcompressed.png';

export default function ThinkingOverlay({ visible, title = 'Thinking…', subtitle = 'Please wait while the app finishes this task.' }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 backdrop-blur-md">
      <div className="mx-4 w-full max-w-sm rounded-3xl border border-white/15 bg-slate-950/75 px-8 py-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center">
          <img
            src={WHEEL_IMAGE_URL}
            alt="Loading wheel"
            className="h-40 w-40 animate-[spin_12s_linear_infinite] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          />
        </div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{subtitle}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse [animation-delay:200ms]" />
          <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
}