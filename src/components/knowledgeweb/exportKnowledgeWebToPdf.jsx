import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const EXPORT_PADDING = 120;
const MAX_EXPORT_PIXELS = 16000000;
const MAX_EXPORT_SCALE = 2;
const MIN_EXPORT_SCALE = 0.7;
const EXPORT_BACKGROUND = '#111827';

function getObjectDimensions(obj) {
  if (obj.object_type === 'section') return { width: obj.width || 400, height: obj.height || 300 };
  if (obj.object_type === 'image') return { width: obj.width || 240, height: obj.height || 160 };
  if (obj.object_type === 'text') return { width: obj.width || 240, height: obj.height || 60 };
  return { width: obj.width || 240, height: obj.height || 160 };
}

function getExportBounds(cards = [], canvasObjects = [], connections = []) {
  const boxes = [
    ...cards.map((card) => ({
      minX: card.x || 0,
      minY: card.y || 0,
      maxX: (card.x || 0) + (card.width || 200),
      maxY: (card.y || 0) + (card.height || 120),
    })),
    ...canvasObjects.map((obj) => {
      const { width, height } = getObjectDimensions(obj);
      return {
        minX: obj.x || 0,
        minY: obj.y || 0,
        maxX: (obj.x || 0) + width,
        maxY: (obj.y || 0) + height,
      };
    }),
  ];

  const reroutePoints = connections.flatMap((connection) => connection.reroute_points || []);
  reroutePoints.forEach((point) => {
    boxes.push({
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y,
    });
  });

  if (boxes.length === 0) {
    return { minX: 0, minY: 0, maxX: 1200, maxY: 800 };
  }

  return boxes.reduce((acc, box) => ({
    minX: Math.min(acc.minX, box.minX),
    minY: Math.min(acc.minY, box.minY),
    maxX: Math.max(acc.maxX, box.maxX),
    maxY: Math.max(acc.maxY, box.maxY),
  }), {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  });
}

function sanitizeFileName(name = 'knowledge-web') {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'knowledge-web';
}

function buildSliceCanvas(sourceCanvas, startY, sliceHeight) {
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = sourceCanvas.width;
  sliceCanvas.height = sliceHeight;

  const ctx = sliceCanvas.getContext('2d');
  ctx.drawImage(
    sourceCanvas,
    0,
    startY,
    sourceCanvas.width,
    sliceHeight,
    0,
    0,
    sourceCanvas.width,
    sliceHeight,
  );

  return sliceCanvas;
}

export default async function exportKnowledgeWebToPdf({
  canvasContentRef,
  cards,
  canvasObjects,
  connections,
  webTitle,
}) {
  if (!canvasContentRef?.current) {
    throw new Error('Knowledge web content is not available for export.');
  }

  const bounds = getExportBounds(cards, canvasObjects, connections);
  const exportWidth = Math.ceil(bounds.maxX - bounds.minX + EXPORT_PADDING * 2);
  const exportHeight = Math.ceil(bounds.maxY - bounds.minY + EXPORT_PADDING * 2);
  const exportScale = Math.max(
    MIN_EXPORT_SCALE,
    Math.min(
      MAX_EXPORT_SCALE,
      Math.sqrt(MAX_EXPORT_PIXELS / Math.max(exportWidth * exportHeight, 1)),
    ),
  );

  const exportStage = document.createElement('div');
  Object.assign(exportStage.style, {
    position: 'fixed',
    left: '-20000px',
    top: '0',
    width: `${exportWidth}px`,
    height: `${exportHeight}px`,
    overflow: 'hidden',
    background: EXPORT_BACKGROUND,
    pointerEvents: 'none',
    zIndex: '-1',
  });

  const clonedContent = canvasContentRef.current.cloneNode(true);
  Object.assign(clonedContent.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${exportWidth}px`,
    height: `${exportHeight}px`,
    transform: `translate(${EXPORT_PADDING - bounds.minX}px, ${EXPORT_PADDING - bounds.minY}px) scale(1)`,
    transformOrigin: 'top left',
  });

  exportStage.appendChild(clonedContent);
  document.body.appendChild(exportStage);

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const renderedCanvas = await html2canvas(exportStage, {
    backgroundColor: EXPORT_BACKGROUND,
    scale: exportScale,
    width: exportWidth,
    height: exportHeight,
    useCORS: true,
    logging: false,
  });

  document.body.removeChild(exportStage);

  const orientation = renderedCanvas.width >= renderedCanvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const sourceSliceHeight = Math.max(1, Math.floor((renderedCanvas.width * pageHeight) / pageWidth));

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < renderedCanvas.height) {
    const sliceHeight = Math.min(sourceSliceHeight, renderedCanvas.height - offsetY);
    const sliceCanvas = buildSliceCanvas(renderedCanvas, offsetY, sliceHeight);
    const imageData = sliceCanvas.toDataURL('image/png');
    const renderedHeight = (sliceHeight * pageWidth) / renderedCanvas.width;

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, renderedHeight, undefined, 'FAST');

    offsetY += sliceHeight;
    pageIndex += 1;
  }

  pdf.save(`${sanitizeFileName(webTitle)}.pdf`);
}