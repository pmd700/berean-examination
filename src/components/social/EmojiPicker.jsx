import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😈','👿','💀','👻','👽','🤖','💩','😺','😸','😹','😻','😼','😽','🙀','😿','😾']
  },
  {
    name: 'Gestures',
    icon: '👋',
    emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦵','🦶','👂','🦻','👃','🧠','👀','👁','👅','👄','💋','🫶']
  },
  {
    name: 'Animals',
    icon: '🐶',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🐢','🐍','🦎','🦂','🦀','🦞','🦐','🦑','🐙','🐠','🐟','🐬','🦈','🐳','🐋','🐊','🐆','🐅','🐘','🦏','🦛','🦒','🐪']
  },
  {
    name: 'Food',
    icon: '🍕',
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥒','🌶','🌽','🥕','🧅','🥔','🍞','🥐','🧀','🍳','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥗','🍿','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🥤','🍺','🍻','🥂','🍷']
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🥋','🎯','⛳','🎣','🏊','🏄','🏇','🚴','🧘','🏋️','🤸','🏆','🥇','🥈','🥉','🎮','🕹','🎲','🧩','🎭','🎨','🎬','🎤','🎧','🎷','🎺','🎸','🥁','🎹']
  },
  {
    name: 'Travel',
    icon: '✈️',
    emojis: ['🚗','🚕','🚌','🏎','🚑','🚒','🛻','🚚','🏍','🛵','🚲','🛴','🚁','✈️','🚀','🛸','⛵','🚢','🏠','🏡','🏢','🏰','🗼','🗽','⛪','🏔','⛰','🌋','🏕','🏖','🏜','🏝','🌍','🌎','🌏','🌅','🌄','🌠','🎆','🎇','🌃','🏙','🌆','🌇','🌉','🌌']
  },
  {
    name: 'Objects',
    icon: '💡',
    emojis: ['⌚','📱','💻','⌨️','🖥','🖨','💿','📷','📸','📹','🎥','📞','📺','📻','🎙','⏰','💡','🔦','💰','💵','💳','💎','🔧','🔨','🛠','🔩','⚙️','🔫','💣','🔪','🗡','⚔️','🛡','🔬','🔭','💉','💊']
  },
  {
    name: 'Symbols',
    icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','⭐','🌟','💫','✨','⚡','🔥','💥','☀️','🌈','❄️','💧','🌊','✅','❌','❓','❗','💯','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','✝️','☪️','🕉','☸️','✡️','🔯','☯️','☮️','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']
  },
];

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const categoryRefs = useRef({});

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const scrollToCategory = (index) => {
    setActiveCategory(index);
    categoryRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[340px] max-w-[90vw] max-h-[70vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-800">
          <span className="text-sm font-semibold text-gray-300">Choose an emoji</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-800 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-gray-800/50 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => scrollToCategory(i)}
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors ${
                activeCategory === i ? 'bg-amber-600/20 ring-1 ring-amber-500/50' : 'hover:bg-gray-800'
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {EMOJI_CATEGORIES.map((cat, ci) => (
            <div key={cat.name} ref={el => categoryRefs.current[ci] = el}>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1 mt-3 first:mt-2 sticky top-0 bg-gray-900 py-1 z-10">
                {cat.name}
              </div>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => { onSelect(emoji); onClose(); }}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-gray-800 active:scale-90 transition-all"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}