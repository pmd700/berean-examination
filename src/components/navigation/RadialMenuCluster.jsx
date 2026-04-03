import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lightbulb, Shield, Network, Users, UserCircle, FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';

const ICON_SIZE = 48;
const ICON_RADIUS = ICON_SIZE / 2;
const WALL = ICON_RADIUS + 10; // hard wall: no icon center goes closer than this to viewport edge
const CONTAINER_SIZE = 500;
const CENTER = CONTAINER_SIZE / 2;

// ─── Zone detection ───
// Corner threshold: if within this fraction of viewport from BOTH edges, it's a corner
const CORNER_FRAC = 0.20; // 20% from edge = corner zone

function getZone(ax, ay, vw, vh) {
  const nearLeft = ax < vw * CORNER_FRAC;
  const nearRight = ax > vw * (1 - CORNER_FRAC);
  const nearTop = ay < vh * CORNER_FRAC;
  const nearBottom = ay > vh * (1 - CORNER_FRAC);

  // Corner = near two perpendicular edges
  if ((nearLeft || nearRight) && (nearTop || nearBottom)) return 'corner';
  // Otherwise it's branch territory (center, edges, etc.)
  return 'branch';
}

// ─── Clamp a position inside the wall ───
function clamp(x, y, vw, vh) {
  return {
    x: Math.max(WALL, Math.min(vw - WALL, x)),
    y: Math.max(WALL, Math.min(vh - WALL, y)),
  };
}

// ─── BRANCH MODE (radial fan toward viewport center) ───
function computeBranchLayout(ax, ay, count) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Direction: point toward viewport center
  const dx = vw / 2 - ax;
  const dy = vh / 2 - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  const centerDeg = len < 1 ? -90 : Math.atan2(dy, dx) * (180 / Math.PI);

  // Try progressively tighter layouts until everything fits
  for (let radius = 120; radius >= 65; radius -= 10) {
    for (let sweep = 140; sweep >= 50; sweep -= 15) {
      const positions = [];
      let allFit = true;
      for (let i = 0; i < count; i++) {
        const angle = count === 1
          ? centerDeg
          : centerDeg - sweep / 2 + (sweep / (count - 1)) * i;
        const rad = (angle * Math.PI) / 180;
        const x = ax + Math.cos(rad) * radius;
        const y = ay + Math.sin(rad) * radius;
        positions.push({ x, y });
        if (x < WALL || x > vw - WALL || y < WALL || y > vh - WALL) {
          allFit = false;
        }
      }
      if (allFit) return positions;
    }
  }

  // Fallback: smallest layout, hard-clamped
  const positions = [];
  const sweep = 50;
  const radius = 65;
  for (let i = 0; i < count; i++) {
    const angle = count === 1
      ? centerDeg
      : centerDeg - sweep / 2 + (sweep / (count - 1)) * i;
    const rad = (angle * Math.PI) / 180;
    const x = ax + Math.cos(rad) * radius;
    const y = ay + Math.sin(rad) * radius;
    const c = clamp(x, y, vw, vh);
    positions.push(c);
  }
  return positions;
}

// ─── RAIL MODE (icons line up along the nearest edge in a straight line) ───
function computeRailLayout(ax, ay, count) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Determine which corner we're nearest
  const nearLeft = ax < vw / 2;
  const nearTop = ay < vh / 2;

  // Rail direction: run along the edge that has MORE room
  // e.g. top-left corner: if more room rightward than downward, rail horizontally
  const horizRoom = nearLeft ? (vw - ax) : ax;
  const vertRoom = nearTop ? (vh - ay) : ay;

  const spacing = 58; // pixels between icon centers
  const offset = 70;  // first icon distance from anchor

  const positions = [];

  if (horizRoom >= vertRoom) {
    // Rail horizontally along the top or bottom edge
    const dirX = nearLeft ? 1 : -1;
    // Slight inward push vertically so icons don't overlap with button
    const dirY = nearTop ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const x = ax + dirX * (offset + i * spacing);
      const y = ay + dirY * (offset * 0.4); // slight vertical offset
      const c = clamp(x, y, vw, vh);
      positions.push(c);
    }
  } else {
    // Rail vertically along the left or right edge
    const dirY = nearTop ? 1 : -1;
    const dirX = nearLeft ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const x = ax + dirX * (offset * 0.4);
      const y = ay + dirY * (offset + i * spacing);
      const c = clamp(x, y, vw, vh);
      positions.push(c);
    }
  }

  return positions;
}

// ─── Master layout ───
function computeLayout(ax, ay, count) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const zone = getZone(ax, ay, vw, vh);

  let positions;
  if (zone === 'corner') {
    positions = computeRailLayout(ax, ay, count);
  } else {
    positions = computeBranchLayout(ax, ay, count);
  }

  // Final safety net: hard-clamp every position
  return positions.map(p => clamp(p.x, p.y, vw, vh));
}

export default function RadialMenuCluster({ isAdmin, isOpen, onClose, hoveredIndex, setHoveredIndex, anchorPos }) {
  const menuItems = [];
  if (isAdmin) {
    menuItems.push({ icon: Shield, href: createPageUrl('AdminPanel'), color: 'text-orange-600' });
  }
  menuItems.push(
    { icon: BookOpen, href: createPageUrl('Study'), color: 'text-orange-600' },
    { icon: Lightbulb, href: createPageUrl('Keywords'), color: 'text-amber-600' },
    { icon: UserCircle, href: createPageUrl('AccountCenter'), color: 'text-purple-600' },
    { icon: Users, href: createPageUrl('Social'), color: 'text-blue-600' },
    { icon: Network, href: createPageUrl('KnowledgeWeb'), color: 'text-cyan-500' },
    { icon: FileText, href: createPageUrl('SourcesLicenses'), color: 'text-slate-600' },
  );

  // Fresh layout every time the menu opens — no stale state
  const positions = useMemo(() => {
    if (!isOpen || !anchorPos) return [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const zone = getZone(anchorPos.x, anchorPos.y, vw, vh);

    let raw;
    if (zone === 'corner') {
      raw = computeRailLayout(anchorPos.x, anchorPos.y, menuItems.length);
    } else {
      raw = computeBranchLayout(anchorPos.x, anchorPos.y, menuItems.length);
    }
    // Hard-clamp safety net
    return raw.map(p => clamp(p.x, p.y, vw, vh));
  }, [isOpen, anchorPos?.x, anchorPos?.y, menuItems.length]);

  // Convert viewport positions to local container coords
  const localPositions = positions.map(p => ({
    x: p.x - (anchorPos?.x || 0) + CENTER,
    y: p.y - (anchorPos?.y || 0) + CENTER,
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            width: `${CONTAINER_SIZE}px`,
            height: `${CONTAINER_SIZE}px`,
            transform: 'translate(-50%, -50%)',
            overflow: 'visible',
          }}
        >
          {/* Connection lines */}
          <svg
            width={CONTAINER_SIZE}
            height={CONTAINER_SIZE}
            className="absolute"
            style={{ left: 0, top: 0, overflow: 'visible' }}
          >
            {menuItems.map((item, index) => {
              const lp = localPositions[index];
              if (!lp) return null;
              return (
                <motion.line
                  key={`strand-${index}`}
                  x1={CENTER}
                  y1={CENTER}
                  stroke="currentColor"
                  strokeWidth={hoveredIndex === index ? '2.5' : '1.5'}
                  className={`transition-all duration-200 ${
                    hoveredIndex === index
                      ? 'text-orange-500 dark:text-orange-400 opacity-80'
                      : 'text-orange-400/40 dark:text-orange-500/30'
                  }`}
                  initial={{ x2: CENTER, y2: CENTER }}
                  animate={{ x2: lp.x, y2: lp.y }}
                  exit={{ x2: CENTER, y2: CENTER }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: index * 0.03 }}
                />
              );
            })}
          </svg>

          {/* Icon buttons */}
          {menuItems.map((item, index) => {
            const lp = localPositions[index];
            if (!lp) return null;
            return (
              <motion.div
                key={index}
                className="absolute pointer-events-auto"
                style={{
                  width: `${ICON_SIZE}px`,
                  height: `${ICON_SIZE}px`,
                  overflow: 'visible',
                }}
                initial={{
                  x: CENTER - ICON_RADIUS,
                  y: CENTER - ICON_RADIUS,
                  opacity: 0,
                  scale: 0.3,
                }}
                animate={{
                  x: lp.x - ICON_RADIUS,
                  y: lp.y - ICON_RADIUS,
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  x: CENTER - ICON_RADIUS,
                  y: CENTER - ICON_RADIUS,
                  opacity: 0,
                  scale: 0.3,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1],
                  delay: index * 0.03,
                }}
              >
                <motion.a
                  href={item.href}
                  onClick={() => onClose()}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className={`relative flex items-center justify-center rounded-full transition-all ${
                    hoveredIndex === index
                      ? 'bg-orange-500 dark:bg-orange-600 shadow-xl'
                      : 'bg-white dark:bg-gray-800 shadow-lg'
                  } border-2 ${
                    hoveredIndex === index
                      ? 'border-orange-600 dark:border-orange-500'
                      : 'border-orange-200 dark:border-gray-700'
                  } cursor-pointer`}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <item.icon
                    className={`w-5 h-5 transition-colors ${
                      hoveredIndex === index ? 'text-white' : item.color
                    }`}
                  />
                  {hoveredIndex === index && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 rounded-full bg-orange-500/40 dark:bg-orange-600/40 blur-xl -z-10"
                    />
                  )}
                </motion.a>
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}