import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { LoadingScreen } from '../components/ui/loading-screen';
import WebListSidebar from '../components/knowledgeweb/WebListSidebar';
import CanvasCard from '../components/knowledgeweb/CanvasCard';
import ConnectionLines, { getPorts } from '../components/knowledgeweb/ConnectionLines';
import FloatingToolbar from '../components/knowledgeweb/FloatingToolbar';
import CardEditor from '../components/knowledgeweb/CardEditor';
import ConnectionEditor from '../components/knowledgeweb/ConnectionEditor';
import SaveIndicator from '../components/knowledgeweb/SaveIndicator';
import SearchBar from '../components/knowledgeweb/SearchBar';
import FocusMode from '../components/knowledgeweb/FocusMode';
import FilterPanel from '../components/knowledgeweb/FilterPanel';
import ViewsManager from '../components/knowledgeweb/ViewsManager';
import TypeLegend from '../components/knowledgeweb/TypeLegend';
import CanvasTextBlock from '../components/knowledgeweb/CanvasTextBlock';
import CanvasSection from '../components/knowledgeweb/CanvasSection';
import CanvasImage from '../components/knowledgeweb/CanvasImage';
import ObjectInspector from '../components/knowledgeweb/ObjectInspector';
import CardLibraryPicker from '../components/knowledgeweb/CardLibraryPicker';
import ShareWebDialog from '../components/knowledgeweb/ShareWebDialog';
import SelectionMarquee from '../components/knowledgeweb/SelectionMarquee';

import useCanvasState from '../components/knowledgeweb/useCanvasState';
import useFilteredGraph from '../components/knowledgeweb/useFilteredGraph';
import { trackActivity } from '../components/utils/activityTracker';
import { Share2, BookCopy, Grid3X3, Magnet, Crosshair, Download } from 'lucide-react';
import exportKnowledgeWebToPdf from '../components/knowledgeweb/exportKnowledgeWebToPdf';

export default function KnowledgeWeb() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [webs, setWebs] = useState([]);
  const [activeWebId, setActiveWebId] = useState(null);
  const [cards, setCards] = useState([]);
  const [connections, setConnections] = useState([]);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [allPlacements, setAllPlacements] = useState([]);

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [marqueeSelection, setMarqueeSelection] = useState(null);
  const [mode, setMode] = useState('hand');
  const [connectionSource, setConnectionSource] = useState(null);
  const [tempLine, setTempLine] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [hoveredConnectionId, setHoveredConnectionId] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Grid & snap state (persisted per user)
  const [showGrid, setShowGrid] = useState(() => localStorage.getItem('kw_grid') === 'true');
  const [snapToGrid, setSnapToGrid] = useState(() => localStorage.getItem('kw_snap') === 'true');
  const GRID_SIZE = 20;

  const [filters, setFilters] = useState({ types: [], tags: [] });
  const [focusState, setFocusState] = useState({ active: false, cardId: null, depth: 1 });
  const [views, setViews] = useState(() => {
    const saved = localStorage.getItem('kw_views');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeViewId, setActiveViewId] = useState(null);

  const containerRef = useRef(null);
  const canvasContentRef = useRef(null);
  const saveTimeout = useRef(null);
  const multiDragOriginRef = useRef(null);
  const suppressCanvasClickRef = useRef(false);
  const canvas = useCanvasState();

  // Keyboard shortcuts for delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      const modeMap = {
        '1': 'card',
        '2': 'connection',
        '3': 'text',
        '4': 'section',
        '5': 'image',
        '6': 'sketch',
        '7': 'hand',
        '8': 'erase',
      };

      if (modeMap[e.key]) {
        setMode(modeMap[e.key]);
        setConnectionSource(null);
        setTempLine(null);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnectionId) {
        deleteConnection(selectedConnectionId);
      }
      if (e.key === 'Escape') {
        setMode('hand');
        setConnectionSource(null);
        setTempLine(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnectionId]);

  const { filteredCards, filteredConnections } = useFilteredGraph(cards, connections, filters, focusState);

  // ── Auth & load ──
  useEffect(() => {
    (async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(createPageUrl('KnowledgeWeb')); return; }
      const u = await base44.auth.me();
      if (!u?.access_key) { window.location.href = createPageUrl('KeyEntry'); return; }
      setUser(u);
      const allWebs = await base44.entities.KnowledgeWeb.list('-updated_date', 100);
      setWebs(allWebs);
      if (allWebs.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const webParam = urlParams.get('web');
        const target = webParam && allWebs.find(w => w.id === webParam) ? webParam : allWebs[0].id;
        await loadWeb(target);
      }
      setLoading(false);
    })();
  }, []);

  // Track activity when active web changes
  useEffect(() => {
    if (!activeWebId) return;
    const web = webs.find(w => w.id === activeWebId);
    trackActivity({
      type: 'knowledge_web',
      icon: 'knowledge_web',
      page: 'KnowledgeWeb',
      title: 'Continue on Knowledge Web?',
      subtitle: web?.title || 'Knowledge Web',
      url_params: `web=${activeWebId}`,
    });
  }, [activeWebId, webs]);

  const loadWeb = async (webId) => {
    setActiveWebId(webId);
    clearSelection();
    setMode('hand');
    setConnectionSource(null);
    setTempLine(null);
    setFocusState({ active: false, cardId: null, depth: 1 });
    setFilters({ types: [], tags: [] });
    setActiveViewId(null);
    const [c, conn, objs] = await Promise.all([
      base44.entities.WebCard.filter({ web_id: webId }),
      base44.entities.WebConnection.filter({ web_id: webId }),
      base44.entities.CanvasObject.filter({ web_id: webId }),
    ]);
    setCards(c);
    setConnections(conn);
    setCanvasObjects(objs);
    // Load placements for "appears on" info
    base44.entities.CardPlacement.filter({ web_id: webId }).then(p => setAllPlacements(p));
  };

  const clearSelection = () => {
    setSelectedCardId(null);
    setSelectedCardIds([]);
    setSelectedConnectionId(null);
    setSelectedObjectId(null);
  };

  const flashSave = useCallback(() => {
    setSaveStatus('saving');
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1200);
    }, 300);
  }, []);

  // ── Web CRUD ──
  const handleCreateWeb = async (title) => {
    const w = await base44.entities.KnowledgeWeb.create({ title });
    setWebs(prev => [w, ...prev]);
    await loadWeb(w.id);
  };

  const handleDeleteWeb = async (id) => {
    await base44.entities.KnowledgeWeb.delete(id);
    const cs = await base44.entities.WebCard.filter({ web_id: id });
    const conns = await base44.entities.WebConnection.filter({ web_id: id });
    const objs = await base44.entities.CanvasObject.filter({ web_id: id });
    await Promise.all([
      ...cs.map(c => base44.entities.WebCard.delete(c.id)),
      ...conns.map(c => base44.entities.WebConnection.delete(c.id)),
      ...objs.map(o => base44.entities.CanvasObject.delete(o.id)),
    ]);
    setWebs(prev => prev.filter(w => w.id !== id));
    if (activeWebId === id) {
      const remaining = webs.filter(w => w.id !== id);
      if (remaining.length > 0) await loadWeb(remaining[0].id);
      else { setActiveWebId(null); setCards([]); setConnections([]); setCanvasObjects([]); setMode('hand'); }
    }
  };

  // ── Card CRUD ──
  const createCard = async (x, y) => {
    if (!activeWebId) return null;
    const card = await base44.entities.WebCard.create({
      web_id: activeWebId, title: 'New Card',
      x: Math.round(x), y: Math.round(y), width: 200, height: 120,
    });
    setCards(prev => [...prev, card]);
    setSelectedCardId(card.id);
    setSelectedCardIds([card.id]);
    setSelectedConnectionId(null);
    setSelectedObjectId(null);
    flashSave();
    return card;
  };

  const updateCard = async (cardId, data) => {
    await base44.entities.WebCard.update(cardId, data);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...data } : c));
    flashSave();
  };

  const deleteCard = async (cardId) => {
    await base44.entities.WebCard.delete(cardId);
    const related = connections.filter(c => c.from_card_id === cardId || c.to_card_id === cardId);
    await Promise.all(related.map(c => base44.entities.WebConnection.delete(c.id)));
    setCards(prev => prev.filter(c => c.id !== cardId));
    setConnections(prev => prev.filter(c => c.from_card_id !== cardId && c.to_card_id !== cardId));
    setSelectedCardId(null);
    setSelectedCardIds(prev => prev.filter(id => id !== cardId));
    if (focusState.active && focusState.cardId === cardId) setFocusState({ active: false, cardId: null, depth: 1 });
    flashSave();
  };

  const handlePositionUpdate = useCallback((cardId, x, y) => {
    const originMap = multiDragOriginRef.current;
    if (originMap?.[cardId]) {
      const dx = x - originMap[cardId].x;
      const dy = y - originMap[cardId].y;
      setCards(prev => prev.map(c => originMap[c.id] ? {
        ...c,
        x: originMap[c.id].x + dx,
        y: originMap[c.id].y + dy,
      } : c));
      return;
    }

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, x, y } : c));
  }, []);

  const snapValue = useCallback((v) => {
    return snapToGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : Math.round(v);
  }, [snapToGrid]);

  const handleCardDragEnd = async (cardId, x, y) => {
    const originMap = multiDragOriginRef.current;
    if (originMap?.[cardId]) {
      const dx = snapValue(x) - originMap[cardId].x;
      const dy = snapValue(y) - originMap[cardId].y;
      const updatedPositions = Object.fromEntries(
        Object.entries(originMap).map(([id, pos]) => [id, {
          x: Math.round(pos.x + dx),
          y: Math.round(pos.y + dy),
        }])
      );

      setCards(prev => prev.map(c => updatedPositions[c.id] ? { ...c, ...updatedPositions[c.id] } : c));
      await Promise.all(
        Object.entries(updatedPositions).map(([id, pos]) => base44.entities.WebCard.update(id, pos))
      );
      multiDragOriginRef.current = null;
      flashSave();
      return;
    }

    const rx = snapValue(x); const ry = snapValue(y);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, x: rx, y: ry } : c));
    await base44.entities.WebCard.update(cardId, { x: rx, y: ry });
    flashSave();
  };

  const handleQuickRename = async (cardId, newTitle) => { await updateCard(cardId, { title: newTitle }); };

  const cardResizeTimers = useRef({});
  const handleCardResize = useCallback((cardId, width, height, options = {}) => {
    const rw = Math.round(width);
    const rh = Math.round(height);

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, width: rw, height: rh } : c));

    clearTimeout(cardResizeTimers.current[cardId]);
    cardResizeTimers.current[cardId] = setTimeout(async () => {
      await base44.entities.WebCard.update(cardId, { width: rw, height: rh });
      if (!options.silent) flashSave();
    }, 200);
  }, [flashSave]);

  const handleImageDrop = async (cardId, file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await updateCard(cardId, { image_url: file_url });
  };

  // ── Canvas object CRUD ──
  const createCanvasObject = async (type, x, y, extra = {}) => {
    if (!activeWebId) return;
    const defaults = {
      text: { width: 240, height: 60, content: '' },
      section: { width: 400, height: 300, title: 'Section', color: 'default' },
      image: { width: 240, height: 160 },
    };
    const obj = await base44.entities.CanvasObject.create({
      web_id: activeWebId,
      object_type: type,
      x: Math.round(x), y: Math.round(y),
      ...defaults[type],
      ...extra,
    });
    setCanvasObjects(prev => [...prev, obj]);
    setSelectedObjectId(obj.id);
    setSelectedCardId(null);
    setSelectedCardIds([]);
    setSelectedConnectionId(null);
    flashSave();
    return obj;
  };

  const updateCanvasObject = async (objId, data) => {
    await base44.entities.CanvasObject.update(objId, data);
    setCanvasObjects(prev => prev.map(o => o.id === objId ? { ...o, ...data } : o));
    flashSave();
  };

  const deleteCanvasObject = async (objId) => {
    await base44.entities.CanvasObject.delete(objId);
    setCanvasObjects(prev => prev.filter(o => o.id !== objId));
    setSelectedObjectId(null);
    flashSave();
  };

  const handleObjPositionUpdate = useCallback((objId, x, y) => {
    setCanvasObjects(prev => prev.map(o => o.id === objId ? { ...o, x, y } : o));
  }, []);

  const handleObjDragEnd = async (objId, x, y) => {
    const rx = snapValue(x); const ry = snapValue(y);
    setCanvasObjects(prev => prev.map(o => o.id === objId ? { ...o, x: rx, y: ry } : o));
    await base44.entities.CanvasObject.update(objId, { x: rx, y: ry });
    flashSave();
  };

  const handleObjResize = useCallback((objId, w, h) => {
    const rw = Math.round(w); const rh = Math.round(h);
    setCanvasObjects(prev => prev.map(o => o.id === objId ? { ...o, width: rw, height: rh } : o));
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      base44.entities.CanvasObject.update(objId, { width: rw, height: rh });
      flashSave();
    }, 300);
  }, []);

  // ── Connection CRUD ──
  const createConnection = async (fromId, toId) => {
    if (!activeWebId || fromId === toId) return;
    const exists = connections.find(c =>
      (c.from_card_id === fromId && c.to_card_id === toId) || (c.from_card_id === toId && c.to_card_id === fromId)
    );
    if (exists) return;
    const conn = await base44.entities.WebConnection.create({ web_id: activeWebId, from_card_id: fromId, to_card_id: toId, has_arrow: true });
    setConnections(prev => [...prev, conn]);
    setSelectedConnectionId(conn.id);
    setSelectedCardId(null);
    setSelectedCardIds([]);
    setSelectedObjectId(null);
    flashSave();
  };

  const updateConnection = async (connId, data) => {
    await base44.entities.WebConnection.update(connId, data);
    setConnections(prev => prev.map(c => c.id === connId ? { ...c, ...data } : c));
    flashSave();
  };

  const deleteConnection = async (connId) => {
    await base44.entities.WebConnection.delete(connId);
    setConnections(prev => prev.filter(c => c.id !== connId));
    setSelectedConnectionId(null);
    flashSave();
  };

  // ── Reroute point CRUD ──
  const handleAddReroutePoint = useCallback((connId, x, y) => {
    setConnections(prev => prev.map(c => {
      if (c.id !== connId) return c;
      const pts = [...(c.reroute_points || []), { x: Math.round(x), y: Math.round(y) }];
      base44.entities.WebConnection.update(connId, { reroute_points: pts });
      flashSave();
      return { ...c, reroute_points: pts };
    }));
  }, [flashSave]);

  const rerouteSaveRef = useRef(null);
  const handleDragReroutePoint = useCallback((connId, pointIndex, x, y) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    setConnections(prev => {
      const updated = prev.map(c => {
        if (c.id !== connId) return c;
        const pts = [...(c.reroute_points || [])];
        if (pts[pointIndex]) pts[pointIndex] = { x: rx, y: ry };
        return { ...c, reroute_points: pts };
      });
      // Schedule debounced save using latest state
      clearTimeout(rerouteSaveRef.current);
      rerouteSaveRef.current = setTimeout(() => {
        const conn = updated.find(c => c.id === connId);
        if (conn) {
          base44.entities.WebConnection.update(connId, { reroute_points: conn.reroute_points });
          flashSave();
        }
      }, 300);
      return updated;
    });
  }, [flashSave]);

  const handleRemoveReroutePoint = useCallback((connId, pointIndex) => {
    setConnections(prev => prev.map(c => {
      if (c.id !== connId) return c;
      const pts = [...(c.reroute_points || [])];
      pts.splice(pointIndex, 1);
      base44.entities.WebConnection.update(connId, { reroute_points: pts });
      flashSave();
      return { ...c, reroute_points: pts };
    }));
  }, [flashSave]);

  // ── Insert blank card on noodle ──
  const handleRequestInsertNode = useCallback(async (connId, x, y) => {
    if (!activeWebId) return;
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;

    const newCard = await base44.entities.WebCard.create({
      web_id: activeWebId,
      title: 'New Card',
      x: Math.round(x - 100), y: Math.round(y - 60),
      width: 200, height: 120,
    });
    setCards(prev => [...prev, newCard]);

    await base44.entities.WebConnection.delete(connId);
    setConnections(prev => prev.filter(c => c.id !== connId));

    const conn1 = await base44.entities.WebConnection.create({
      web_id: activeWebId,
      from_card_id: conn.from_card_id,
      to_card_id: newCard.id,
    });
    const conn2 = await base44.entities.WebConnection.create({
      web_id: activeWebId,
      from_card_id: newCard.id,
      to_card_id: conn.to_card_id,
    });
    setConnections(prev => [...prev, conn1, conn2]);

    setSelectedCardId(newCard.id);
    setSelectedCardIds([newCard.id]);
    setSelectedConnectionId(null);
    setSelectedObjectId(null);
    flashSave();
  }, [connections, activeWebId, flashSave]);

  // ── Canvas click ──
  const handleCanvasClick = async (e) => {
    if (suppressCanvasClickRef.current) {
      suppressCanvasClickRef.current = false;
      return;
    }
    if (e.target.dataset.canvas !== 'true') return;
    if (!containerRef.current || !activeWebId) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = canvas.screenToCanvas(e.clientX, e.clientY, rect);

    if (mode === 'card' || mode === 'sketch') {
      await createCard(pos.x - 100, pos.y - 60);
    } else if (mode === 'text') {
      await createCanvasObject('text', pos.x - 120, pos.y - 30);
    } else if (mode === 'section') {
      await createCanvasObject('section', pos.x - 200, pos.y - 150);
    } else if (mode === 'image') {
      // Open file picker for image
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await createCanvasObject('image', pos.x - 120, pos.y - 80, { image_url: file_url });
      };
      input.click();
    } else {
      clearSelection();
      setConnectionSource(null);
      setTempLine(null);
    }
  };

  // Canvas-level drag & drop for images
  const handleCanvasDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/') || !containerRef.current || !activeWebId) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = canvas.screenToCanvas(e.clientX, e.clientY, rect);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await createCanvasObject('image', pos.x - 120, pos.y - 80, { image_url: file_url });
  };

  const startMarqueeSelection = useCallback((e) => {
    if (!containerRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    suppressCanvasClickRef.current = true;
    multiDragOriginRef.current = null;

    const rect = containerRef.current.getBoundingClientRect();
    const startCanvas = canvas.screenToCanvas(e.clientX, e.clientY, rect);
    const startScreenX = e.clientX - rect.left;
    const startScreenY = e.clientY - rect.top;

    setSelectedCardId(null);
    setSelectedCardIds([]);
    setSelectedConnectionId(null);
    setSelectedObjectId(null);
    setConnectionSource(null);
    setTempLine(null);
    setMarqueeSelection({
      startCanvasX: startCanvas.x,
      startCanvasY: startCanvas.y,
      endCanvasX: startCanvas.x,
      endCanvasY: startCanvas.y,
      startScreenX,
      startScreenY,
      endScreenX: startScreenX,
      endScreenY: startScreenY,
    });

    const getMarqueeSelectedIds = (endCanvas) => {
      const minX = Math.min(startCanvas.x, endCanvas.x);
      const maxX = Math.max(startCanvas.x, endCanvas.x);
      const minY = Math.min(startCanvas.y, endCanvas.y);
      const maxY = Math.max(startCanvas.y, endCanvas.y);

      return filteredCards.filter((card) => {
        const cardX = card.x || 0;
        const cardY = card.y || 0;
        const cardWidth = card.width || 200;
        const cardHeight = card.height || 120;
        return cardX < maxX && cardX + cardWidth > minX && cardY < maxY && cardY + cardHeight > minY;
      }).map(card => card.id);
    };

    const onMove = (ev) => {
      const currentCanvas = canvas.screenToCanvas(ev.clientX, ev.clientY, rect);
      const ids = getMarqueeSelectedIds(currentCanvas);

      setSelectedCardIds(ids);
      setMarqueeSelection(prev => prev ? {
        ...prev,
        endCanvasX: currentCanvas.x,
        endCanvasY: currentCanvas.y,
        endScreenX: ev.clientX - rect.left,
        endScreenY: ev.clientY - rect.top,
      } : prev);
    };

    const onUp = (ev) => {
      const endCanvas = canvas.screenToCanvas(ev.clientX, ev.clientY, rect);
      const ids = getMarqueeSelectedIds(endCanvas);

      setSelectedCardIds(ids);
      setSelectedCardId(ids.length === 1 ? ids[0] : null);
      setMarqueeSelection(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setTimeout(() => {
        suppressCanvasClickRef.current = false;
      }, 0);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [canvas, filteredCards]);

  const handleCardSelect = (cardId) => {
    if (mode === 'erase') {
      deleteCard(cardId);
      return;
    }
    if (mode === 'connection') {
      setSelectedCardIds([]);
      if (!connectionSource) { setConnectionSource(cardId); }
      else { createConnection(connectionSource, cardId); setConnectionSource(null); setTempLine(null); }
      return;
    }
    if (selectedCardIds.length > 1 && selectedCardIds.includes(cardId)) {
      setSelectedCardId(null);
      setSelectedConnectionId(null);
      setSelectedObjectId(null);
      return;
    }
    setSelectedCardId(cardId);
    setSelectedCardIds([cardId]);
    setSelectedConnectionId(null);
    setSelectedObjectId(null);
  };

  const handleObjectSelect = (objId) => {
    if (mode === 'erase') {
      deleteCanvasObject(objId);
      return;
    }
    setSelectedObjectId(objId);
    setSelectedCardId(null);
    setSelectedCardIds([]);
    setSelectedConnectionId(null);
  };

  const sketchDragCard = useRef(null);
  const handleCardDragStart = useCallback((cardId) => {
    if (mode === 'sketch') sketchDragCard.current = cardId;

    if (selectedCardIds.length > 1 && selectedCardIds.includes(cardId)) {
      multiDragOriginRef.current = Object.fromEntries(
        cards
          .filter(card => selectedCardIds.includes(card.id))
          .map(card => [card.id, { x: card.x, y: card.y }])
      );
      return;
    }

    multiDragOriginRef.current = null;
  }, [mode, cards, selectedCardIds]);

  const handleCanvasMouseMove = (e) => {
    canvas.onPanMove(e);
    if (mode === 'connection' && connectionSource && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pos = canvas.screenToCanvas(e.clientX, e.clientY, rect);
      const sourceCard = cards.find(c => c.id === connectionSource);
      if (sourceCard) {
        const ports = getPorts(sourceCard);
        const cx = (sourceCard.x || 0) + (sourceCard.width || 200) / 2;
        const cy = (sourceCard.y || 0) + (sourceCard.height || 120) / 2;
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        let port;
        if (Math.abs(dx) >= Math.abs(dy)) { port = dx >= 0 ? ports.right : ports.left; }
        else { port = dy >= 0 ? ports.bottom : ports.top; }
        setTempLine({ x1: port.stemX, y1: port.stemY, x2: pos.x, y2: pos.y });
      }
    }
  };

  // ── Search / Focus / Views ──
  const handleJumpToCard = useCallback((card) => {
    setSelectedCardId(card.id);
    setSelectedCardIds([card.id]);
    setSelectedConnectionId(null);
    setSelectedObjectId(null);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = card.x + (card.width || 200) / 2;
      const centerY = card.y + (card.height || 120) / 2;
      // Account for inspector panel that will open
      const inspectorWidth = 320;
      canvas.smoothPanTo(centerX, centerY, rect.width - inspectorWidth, rect.height, canvas.zoom);
    }
  }, [canvas.zoom, canvas.smoothPanTo]);

  // Click-to-center: called when a card is clicked without dragging
  const handleCardClickNoDrag = useCallback((cardId) => {
    if (selectedCardIds.length > 1 && selectedCardIds.includes(cardId)) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cardCenterX = card.x + (card.width || 200) / 2;
    const cardCenterY = card.y + (card.height || 120) / 2;

    // The inspector panel (~320px) will open on the right when a card is selected.
    // The sidebar is on the left (part of flex layout, not inside the canvas container).
    // containerRef is the canvas area, so rect.width already excludes the sidebar.
    // We need to subtract the inspector width from the right.
    const inspectorWidth = 320;
    const usableWidth = rect.width - inspectorWidth;
    const usableHeight = rect.height;

    // Check if already centered (within tolerance)
    const currentScreenX = cardCenterX * canvas.zoom + canvas.pan.x;
    const currentScreenY = cardCenterY * canvas.zoom + canvas.pan.y;
    const targetScreenX = usableWidth / 2;
    const targetScreenY = usableHeight / 2;
    const dist = Math.sqrt(Math.pow(currentScreenX - targetScreenX, 2) + Math.pow(currentScreenY - targetScreenY, 2));
    if (dist < 20) return; // Already centered, skip

    canvas.smoothPanTo(cardCenterX, cardCenterY, usableWidth, usableHeight, canvas.zoom);
  }, [cards, selectedCardIds, canvas.zoom, canvas.pan, canvas.smoothPanTo]);

  const handleFocus = useCallback((cardId) => {
    setFocusState(prev => prev.active && prev.cardId === cardId
      ? { active: false, cardId: null, depth: 1 }
      : { active: true, cardId, depth: prev.depth });
  }, []);

  const exitFocus = useCallback(() => setFocusState({ active: false, cardId: null, depth: 1 }), []);

  const saveView = useCallback((name) => {
    const nv = { id: Date.now().toString(), name, webId: activeWebId, filters: { ...filters }, colorByType: true };
    const updated = [...views, nv];
    setViews(updated);
    localStorage.setItem('kw_views', JSON.stringify(updated));
    setActiveViewId(nv.id);
  }, [filters, activeWebId, views]);

  const loadView = useCallback((viewId) => {
    const view = views.find(v => v.id === viewId);
    if (view) { setFilters(view.filters || { types: [], tags: [] }); setActiveViewId(viewId); }
  }, [views]);

  const deleteView = useCallback((viewId) => {
    const updated = views.filter(v => v.id !== viewId);
    setViews(updated);
    localStorage.setItem('kw_views', JSON.stringify(updated));
    if (activeViewId === viewId) setActiveViewId(null);
  }, [views, activeViewId]);

  // ── Sharing ──
  const handleToggleShare = async (share) => {
    const web = webs.find(w => w.id === activeWebId);
    if (!web) return;
    const shareId = share ? (web.share_id || Math.random().toString(36).slice(2, 10)) : web.share_id;
    await base44.entities.KnowledgeWeb.update(activeWebId, { is_shared: share, share_id: shareId });
    setWebs(prev => prev.map(w => w.id === activeWebId ? { ...w, is_shared: share, share_id: shareId } : w));
  };

  // ── Card library: place existing card on this web ──
  const handlePlaceCard = async (card) => {
    if (!activeWebId) return;
    // Create a placement record and add to current cards
    const placement = await base44.entities.CardPlacement.create({
      web_id: activeWebId, card_id: card.id, x: 100, y: 100, width: card.width || 200, height: card.height || 120,
    });
    // Create a reference card on this web (copy with shared title/desc but own position)
    const newCard = await base44.entities.WebCard.create({
      web_id: activeWebId, title: card.title, description: card.description,
      card_type: card.card_type, tags: card.tags || [], scripture_refs: card.scripture_refs || [],
      image_url: card.image_url || '', x: 100, y: 100, width: card.width || 200, height: card.height || 120,
    });
    setCards(prev => [...prev, newCard]);
    setAllPlacements(prev => [...prev, placement]);
    setShowLibrary(false);
    flashSave();
  };

  const selectedCard = cards.find(c => c.id === selectedCardId);
  const selectedConnection = connections.find(c => c.id === selectedConnectionId);
  const selectedObject = canvasObjects.find(o => o.id === selectedObjectId);
  const focusCard = focusState.active ? cards.find(c => c.id === focusState.cardId) : null;
  const activeWeb = webs.find(w => w.id === activeWebId);

  if (loading) return <LoadingScreen message="Loading Knowledge Web..." />;

  const toggleGrid = () => {
    const next = !showGrid;
    setShowGrid(next);
    localStorage.setItem('kw_grid', String(next));
  };

  const toggleSnap = () => {
    const next = !snapToGrid;
    setSnapToGrid(next);
    localStorage.setItem('kw_snap', String(next));
  };

  const handleRecenterToWork = () => {
    if (!containerRef.current) return;

    const items = [
      ...cards.map((card) => ({
        x: card.x || 0,
        y: card.y || 0,
        width: card.width || 200,
        height: card.height || 120,
      })),
      ...canvasObjects.map((obj) => ({
        x: obj.x || 0,
        y: obj.y || 0,
        width: obj.width || 240,
        height: obj.height || 160,
      })),
    ];

    if (items.length === 0) {
      canvas.smoothPanTo(0, 0, containerRef.current.clientWidth, containerRef.current.clientHeight, canvas.zoom);
      return;
    }

    const bounds = items.reduce((acc, item) => ({
      minX: Math.min(acc.minX, item.x),
      minY: Math.min(acc.minY, item.y),
      maxX: Math.max(acc.maxX, item.x + item.width),
      maxY: Math.max(acc.maxY, item.y + item.height),
    }), {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    });

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    canvas.smoothPanTo(
      centerX,
      centerY,
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
      canvas.zoom,
    );
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportKnowledgeWebToPdf({
        canvasContentRef,
        cards,
        canvasObjects,
        connections,
        webTitle: activeWeb?.title || 'knowledge-web',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {showSidebar && (
        <WebListSidebar
          webs={webs} activeWebId={activeWebId}
          onSelect={loadWeb} onCreate={handleCreateWeb} onDelete={handleDeleteWeb}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <div className="h-10 bg-gray-850 border-b border-gray-800 flex items-center px-3 gap-2 z-20 flex-shrink-0" style={{ backgroundColor: '#1a1f2e' }}>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-gray-400 hover:text-gray-200 text-xs font-medium flex-shrink-0"
          >
            {showSidebar ? '◀' : '▶ Webs'}
          </button>
          {activeWebId && (
            <span className="text-sm text-gray-300 font-medium truncate">{activeWeb?.title}</span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {activeWebId && (
              <>
                <button
                  onClick={() => setShowLibrary(!showLibrary)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors text-xs"
                >
                  <BookCopy className="w-3 h-3" />
                  <span className="hidden sm:inline">Library</span>
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
                </button>
                <button
                  onClick={() => setShowShareDialog(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                    activeWeb?.is_shared
                      ? 'bg-green-600/15 border-green-600/30 text-green-400'
                      : 'bg-gray-800/60 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <Share2 className="w-3 h-3" />
                  <span className="hidden sm:inline">{activeWeb?.is_shared ? 'Shared' : 'Share'}</span>
                </button>
                <SearchBar cards={cards} onJumpToCard={handleJumpToCard} />
                <FilterPanel cards={cards} filters={filters} onFiltersChange={(f) => { setFilters(f); setActiveViewId(null); }} />
                <ViewsManager
                  views={views.filter(v => v.webId === activeWebId)}
                  activeViewId={activeViewId}
                  onSaveView={saveView} onLoadView={loadView} onDeleteView={deleteView}
                  currentFilters={filters}
                />
              </>
            )}
            <div className="flex items-center gap-1 ml-2 border-l border-gray-700/50 pl-2">
              <button
                onClick={handleRecenterToWork}
                title="Recenter to work"
                className="p-1 rounded transition-colors text-gray-600 hover:text-amber-400"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleGrid}
                title="Toggle grid"
                className={`p-1 rounded transition-colors ${showGrid ? 'text-amber-400 bg-amber-600/15' : 'text-gray-600 hover:text-gray-400'}`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleSnap}
                title="Toggle snap to grid"
                className={`p-1 rounded transition-colors ${snapToGrid ? 'text-amber-400 bg-amber-600/15' : 'text-gray-600 hover:text-gray-400'}`}
              >
                <Magnet className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-[10px] text-gray-600 ml-2 hidden sm:inline">
              {filteredCards.length}/{cards.length} cards
            </span>
          </div>
        </div>

        {/* Card Library Picker */}
        <CardLibraryPicker
          open={showLibrary}
          onClose={() => setShowLibrary(false)}
          onPlaceCard={handlePlaceCard}
          currentWebCards={cards}
        />

        {/* Share Dialog */}
        <ShareWebDialog
          open={showShareDialog}
          web={activeWeb}
          onToggleShare={handleToggleShare}
          onClose={() => setShowShareDialog(false)}
        />

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <SaveIndicator status={saveStatus} />
          <FocusMode
            isActive={focusState.active} depth={focusState.depth}
            onToggle={exitFocus} onDepthChange={d => setFocusState(p => ({ ...p, depth: d }))}
            selectedCardTitle={focusCard?.title}
          />

          {!activeWebId ? (
            <div className="flex items-center justify-center h-full text-gray-600">
              <div className="text-center">
                <p className="text-lg font-medium mb-1">No web selected</p>
                <p className="text-sm">Create a Knowledge Web to get started</p>
              </div>
            </div>
          ) : (
            <>
              <div
                ref={containerRef}
                data-canvas="true"
                className={`w-full h-full ${canvas.isPanning ? 'cursor-grabbing' : mode === 'card' || mode === 'sketch' || mode === 'text' || mode === 'section' || mode === 'image' ? 'cursor-crosshair' : mode === 'erase' ? 'cursor-not-allowed' : mode === 'hand' ? 'cursor-default' : 'cursor-default'}`}
                onWheel={canvas.handleWheel}
                onMouseDown={(e) => {
                  if (e.target.dataset.canvas !== 'true') return;
                  if (e.metaKey || e.ctrlKey) {
                    startMarqueeSelection(e);
                    return;
                  }
                  canvas.startPan(e);
                }}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={() => canvas.endPan()}
                onClick={handleCanvasClick}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
              >
                {showGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    data-canvas="true"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
                      `,
                      backgroundSize: `${GRID_SIZE * canvas.zoom}px ${GRID_SIZE * canvas.zoom}px`,
                      backgroundPosition: `${canvas.pan.x % (GRID_SIZE * canvas.zoom)}px ${canvas.pan.y % (GRID_SIZE * canvas.zoom)}px`,
                    }}
                  />
                )}

                <SelectionMarquee selection={marqueeSelection} />

                <div
                  ref={canvasContentRef}
                  className="absolute origin-top-left"
                  data-canvas="true"
                  style={{
                    transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom})`,
                    width: '100%', height: '100%',
                  }}
                >
                  {/* Sections render first (below everything) */}
                  {canvasObjects.filter(o => o.object_type === 'section').map(obj => (
                    <CanvasSection
                      key={obj.id} obj={obj} zoom={canvas.zoom}
                      isSelected={selectedObjectId === obj.id}
                      onSelect={handleObjectSelect}
                      onDragEnd={handleObjDragEnd}
                      onPositionUpdate={handleObjPositionUpdate}
                      onUpdate={updateCanvasObject}
                      onResize={handleObjResize}
                    />
                  ))}

                  <ConnectionLines
                    connections={filteredConnections} cards={filteredCards}
                    selectedConnectionId={selectedConnectionId}
                    onSelectConnection={(id) => {
                      if (mode === 'erase') {
                        deleteConnection(id);
                        return;
                      }
                      setSelectedConnectionId(id);
                      setSelectedCardId(null);
                      setSelectedCardIds([]);
                      setSelectedObjectId(null);
                    }}
                    tempLine={tempLine}
                    hoveredConnectionId={hoveredConnectionId}
                    onHoverConnection={setHoveredConnectionId}
                    onAddReroutePoint={handleAddReroutePoint}
                    onDragReroutePoint={handleDragReroutePoint}
                    onRemoveReroutePoint={handleRemoveReroutePoint}
                    onRequestInsertNode={handleRequestInsertNode}
                  />

                  {/* Images */}
                  {canvasObjects.filter(o => o.object_type === 'image').map(obj => (
                    <CanvasImage
                      key={obj.id} obj={obj} zoom={canvas.zoom}
                      isSelected={selectedObjectId === obj.id}
                      onSelect={handleObjectSelect}
                      onDragEnd={handleObjDragEnd}
                      onPositionUpdate={handleObjPositionUpdate}
                    />
                  ))}

                  {/* Text blocks */}
                  {canvasObjects.filter(o => o.object_type === 'text').map(obj => (
                    <CanvasTextBlock
                      key={obj.id} obj={obj} zoom={canvas.zoom}
                      isSelected={selectedObjectId === obj.id}
                      onSelect={handleObjectSelect}
                      onDragEnd={handleObjDragEnd}
                      onPositionUpdate={handleObjPositionUpdate}
                      onUpdate={updateCanvasObject}
                      onDelete={deleteCanvasObject}
                    />
                  ))}

                  {/* Cards */}
                  {filteredCards.map(card => (
                    <CanvasCard
                      key={card.id} card={card} zoom={canvas.zoom}
                      isSelected={selectedCardIds.includes(card.id) || connectionSource === card.id}
                      onSelect={handleCardSelect}
                      onDragEnd={handleCardDragEnd}
                      onDragStart={handleCardDragStart}
                      onPositionUpdate={handlePositionUpdate}
                      onQuickRename={handleQuickRename}
                      onImageDrop={handleImageDrop}
                      onClickNoDrag={handleCardClickNoDrag}
                      onResize={handleCardResize}
                    />
                  ))}
                </div>
              </div>

              <TypeLegend cards={filteredCards} />
              <FloatingToolbar mode={mode} onModeChange={setMode} />
            </>
          )}
        </div>
      </div>

      {/* Inspector panels */}
      {selectedCard && selectedCardIds.length <= 1 && (
        <CardEditor
          card={selectedCard} webs={webs} allPlacements={allPlacements}
          onUpdate={updateCard} onDelete={deleteCard}
          onClose={() => {
            setSelectedCardId(null);
            setSelectedCardIds([]);
          }}
          onFocus={handleFocus}
          isFocused={focusState.active && focusState.cardId === selectedCardId}
          onJumpToWeb={loadWeb}
        />
      )}
      {selectedConnection && !selectedCard && !selectedObject && (
        <ConnectionEditor
          connection={selectedConnection} cards={cards}
          onUpdate={updateConnection} onDelete={deleteConnection}
          onClose={() => setSelectedConnectionId(null)}
        />
      )}

      {selectedObject && !selectedCard && !selectedConnection && (
        <ObjectInspector
          obj={selectedObject}
          onUpdate={updateCanvasObject}
          onDelete={deleteCanvasObject}
          onClose={() => setSelectedObjectId(null)}
        />
      )}
    </div>
  );
}