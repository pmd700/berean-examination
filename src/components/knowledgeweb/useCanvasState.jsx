import { useState, useRef, useCallback, useEffect } from 'react';

export default function useCanvasState() {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);

  // Zoom around the cursor so the hovered point stays fixed under the mouse
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom((prevZoom) => {
      const newZoom = Math.max(0.1, Math.min(5, prevZoom * factor));

      setPan((prevPan) => {
        const worldX = (mouseX - prevPan.x) / prevZoom;
        const worldY = (mouseY - prevPan.y) / prevZoom;

        return {
          x: mouseX - worldX * newZoom,
          y: mouseY - worldY * newZoom,
        };
      });

      return newZoom;
    });
  }, []);

  const startPan = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && e.target.dataset.canvas === 'true')) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { x: 0, y: 0 };
      setPan(prev => {
        panOrigin.current = { ...prev };
        return prev;
      });
    }
  }, []);

  const onPanMove = useCallback((e) => {
    if (!isPanning) return;
    if ('buttons' in e && e.buttons === 0) {
      setIsPanning(false);
      return;
    }
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({
      x: panOrigin.current.x + dx,
      y: panOrigin.current.y + dy,
    });
  }, [isPanning]);

  const endPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const stopPan = () => setIsPanning(false);
    window.addEventListener('mouseup', stopPan);
    window.addEventListener('touchend', stopPan);
    window.addEventListener('touchcancel', stopPan);

    return () => {
      window.removeEventListener('mouseup', stopPan);
      window.removeEventListener('touchend', stopPan);
      window.removeEventListener('touchcancel', stopPan);
    };
  }, []);

  const screenToCanvas = useCallback((screenX, screenY, containerRect) => {
    return {
      x: (screenX - containerRect.left - pan.x) / zoom,
      y: (screenY - containerRect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  /**
   * Smoothly pan so that (canvasX, canvasY) ends up exactly centered
   * in the given viewport dimensions.
   */
  const smoothPanTo = useCallback((canvasX, canvasY, viewportWidth, viewportHeight, currentZoom) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const targetPanX = viewportWidth / 2 - canvasX * currentZoom;
    const targetPanY = viewportHeight / 2 - canvasY * currentZoom;

    // Read starting pan
    let startPanX = 0, startPanY = 0;
    setPan(prev => {
      startPanX = prev.x;
      startPanY = prev.y;
      return prev;
    });

    const duration = 300;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);

      const x = startPanX + (targetPanX - startPanX) * eased;
      const y = startPanY + (targetPanY - startPanY) * eased;
      setPan({ x, y });

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure exact final position
        setPan({ x: targetPanX, y: targetPanY });
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  return {
    pan, setPan,
    zoom, setZoom,
    isPanning,
    handleWheel,
    startPan,
    onPanMove,
    endPan,
    screenToCanvas,
    smoothPanTo,
  };
}