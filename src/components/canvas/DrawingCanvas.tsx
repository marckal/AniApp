import { useRef, useEffect, useCallback, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Point, Stroke } from '@/types';
import {
  type Affine,
  type BBox,
  type HandleId,
  strokeBBox,
  unionBBox,
  intersectsBBox,
  pointInBBox,
  bboxCenter,
  getHandles,
  oppositeHandlePoint,
  transformStroke,
  translation,
  scaleAbout,
  rotationAbout,
  shapeCornerPoints,
} from '@/lib/geometry';
import { hexToRgba, getCanvasCoordinates, constrainPoint } from '@/lib/canvas/coordinateSystem';
import { drawShapeOnContext, renderFrameLayers } from '@/lib/canvas/renderer';
import CanvasRulers from './CanvasRulers';

const SNAP_DISTANCE = 8; // px em coordenadas de tela

// ---- Seleção / Transformação (tipos internos) ----
interface SelDragState {
  mode: 'marquee' | 'move';
  start: Point;
  indices: number[];
  base: Stroke[]; // snapshot dos traços selecionados (para move)
  pushedUndo: boolean;
}

interface TransformState {
  indices: number[];
  base: Stroke[]; // snapshot dos traços na entrada do modo transformação
  changed: boolean; // houve pelo menos um arrasto (undo empurrado)
}

interface TransformDrag {
  kind: 'scale' | 'rotate' | 'move';
  handle: HandleId | null;
  start: Point;
  fixed: Point; // ponto oposto (scale) ou centro (rotate)
  pushedUndo: boolean;
}

function drawSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  bbox: BBox,
  zoom: number,
  withHandles = true
) {
  ctx.save();
  ctx.strokeStyle = '#f5c518';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([6 / zoom, 4 / zoom]);
  ctx.strokeRect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
  ctx.setLineDash([]);

  if (withHandles) {
    const hs = 10 / zoom;
    const handles = getHandles(bbox, zoom);
    for (const h of handles) {
      ctx.beginPath();
      if (h.id === 'rot') {
        // Haste de rotação no topo
        const cx = (bbox.minX + bbox.maxX) / 2;
        ctx.moveTo(cx, bbox.minY);
        ctx.lineTo(cx, h.y);
        ctx.strokeStyle = '#f5c518';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();

        const rRot = 12 / zoom; // larger radius for better UX
        ctx.beginPath();
        ctx.arc(h.x, h.y, rRot, 0, Math.PI * 2);
        ctx.fillStyle = '#f5c518';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(h.x, h.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        // Handles de canto (escala/deformação) e arestas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5 / zoom;
        ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
      }
    }
  }
  ctx.restore();
}

function selectionBBox(strokes: Stroke[], indices: number[]): BBox | null {
  return unionBBox(indices.map((i) => (i < strokes.length ? strokeBBox(strokes[i]) : null)));
}

export default function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const leftRulerRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef<Point[]>([]);
  const shapeStart = useRef<Point | null>(null);
  const shapeEnd = useRef<Point | null>(null);
  const isShapeDrawing = useRef(false);
  const lastStrokeEnd = useRef<Point | null>(null); // para Shift+clique (linha reta)
  const dragGuide = useRef<{ axis: 'x' | 'y'; index: number } | null>(null);
  const selDrag = useRef<SelDragState | null>(null);
  const transformRef = useRef<TransformState | null>(null);
  const transformDrag = useRef<TransformDrag | null>(null);
  const [transformActive, setTransformActive] = useState(false);
  const [cursor, setCursor] = useState<string>('crosshair');

  const project = useStore((s) => s.project);
  const tool = useStore((s) => s.tool);
  const brush = useStore((s) => s.brush);
  const zoom = useStore((s) => s.zoom);
  const pan = useStore((s) => s.pan);
  const showGrid = useStore((s) => s.showGrid);
  const showRulers = useStore((s) => s.showRulers);
  const showGuides = useStore((s) => s.showGuides);
  const snapToGuides = useStore((s) => s.snapToGuides);
  const guides = useStore((s) => s.guides);
  const playback = useStore((s) => s.playback);
  const onionSkinOpacity = useStore((s) => s.onionSkinOpacity);
  const addStroke = useStore((s) => s.addStroke);
  const setZoom = useStore((s) => s.setZoom);
  const setPan = useStore((s) => s.setPan);
  const setBrush = useStore((s) => s.setBrush);
  const addGuide = useStore((s) => s.addGuide);
  const moveGuide = useStore((s) => s.moveGuide);
  const removeGuide = useStore((s) => s.removeGuide);
  const selection = useStore((s) => s.selection);
  const setSelection = useStore((s) => s.setSelection);
  const pushUndo = useStore((s) => s.pushUndo);
  const setStrokesLive = useStore((s) => s.setStrokesLive);
  const setTool = useStore((s) => s.setTool);
  const updateProject = useStore((s) => s.updateProject);

  const currentFrame = project.frames[project.currentFrameIndex];
  const currentLayer = currentFrame?.layers[project.currentLayerIndex];
  const isShapeTool = tool === 'rectangle' || tool === 'circle' || tool === 'line';

  // Snap de um ponto às guias próximas
  const snapPoint = useCallback(
    (p: Point): Point => {
      if (!snapToGuides || !showGuides) return p;
      const threshold = SNAP_DISTANCE / zoom;
      let { x, y } = p;
      for (const gx of guides.x) {
        if (Math.abs(p.x - gx) <= threshold) {
          x = gx;
          break;
        }
      }
      for (const gy of guides.y) {
        if (Math.abs(p.y - gy) <= threshold) {
          y = gy;
          break;
        }
      }
      return { ...p, x, y };
    },
    [snapToGuides, showGuides, guides, zoom]
  );

  // Renderiza um frame: cada camada é composta em um canvas offscreen
  // (necessário para a borracha apagar apenas a própria camada e para o fill)
  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, frameIndex: number, opacity = 1, overrideColor?: string) => {
      const frame = project.frames[frameIndex];
      if (frame) {
        renderFrameLayers(ctx, frame, opacity, overrideColor);
      }
    },
    [project.frames]
  );

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = project.width;
    canvas.height = project.height;

    ctx.fillStyle = project.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (showGrid) {
      ctx.strokeStyle = 'rgba(100,100,100,0.15)';
      ctx.lineWidth = 1;
      const gridSize = project.gridSize || 50;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    if (playback.onionSkin && tool !== 'move') {
      const prevFrames = Math.min(playback.onionSkinFrames, project.currentFrameIndex);
      for (let i = 1; i <= prevFrames; i++) {
        const idx = project.currentFrameIndex - i;
        const opacity = onionSkinOpacity * (1 - i / (prevFrames + 1));
        renderFrame(ctx, idx, opacity, '#ff5c5c');
      }
      const nextFrames = Math.min(
        playback.onionSkinFrames,
        project.frames.length - 1 - project.currentFrameIndex
      );
      for (let i = 1; i <= nextFrames; i++) {
        const idx = project.currentFrameIndex + i;
        const opacity = onionSkinOpacity * (1 - i / (nextFrames + 1));
        renderFrame(ctx, idx, opacity, '#5c9cff');
      }
    }

    renderFrame(ctx, project.currentFrameIndex, 1);
  }, [
    project,
    renderFrame,
    showGrid,
    playback.onionSkin,
    playback.onionSkinFrames,
    tool,
    onionSkinOpacity,
  ]);

  // ---- Seleção: helpers ----
  const getSelectedStrokes = useCallback((): { indices: number[]; strokes: Stroke[] } => {
    const st = useStore.getState();
    const layer =
      st.project.frames[st.project.currentFrameIndex]?.layers[st.project.currentLayerIndex];
    if (!layer || !st.selection) return { indices: [], strokes: [] };
    const indices = st.selection.filter((i) => i >= 0 && i < layer.strokes.length);
    return { indices, strokes: indices.map((i) => layer.strokes[i]) };
  }, []);

  const applyLiveToSelection = useCallback(
    (indices: number[], transformed: Stroke[]) => {
      const st = useStore.getState();
      const fi = st.project.currentFrameIndex;
      const li = st.project.currentLayerIndex;
      const layer = st.project.frames[fi]?.layers[li];
      if (!layer) return;
      const strokes = [...layer.strokes];
      indices.forEach((idx, k) => {
        if (idx < strokes.length) strokes[idx] = transformed[k];
      });
      setStrokesLive(fi, li, strokes);
    },
    [setStrokesLive]
  );

  // ---- Transformação (Ctrl/Cmd+T) ----
  const startTransform = useCallback(() => {
    const { indices, strokes } = getSelectedStrokes();
    if (indices.length === 0) return;
    transformRef.current = { indices, base: strokes, changed: false };
    setTransformActive(true);
    if (useStore.getState().tool !== 'select') setTool('select');
  }, [getSelectedStrokes, setTool]);

  const commitTransform = useCallback(() => {
    transformRef.current = null;
    transformDrag.current = null;
    setTransformActive(false);
  }, []);

  const cancelTransform = useCallback(() => {
    const tf = transformRef.current;
    const st = useStore.getState();
    const fi = st.project.currentFrameIndex;
    const li = st.project.currentLayerIndex;
    if (tf?.changed) {
      // o undo empurrado no primeiro arrasto restaura o estado pré-transformação
      st.undo(fi, li);
    } else if (tf) {
      const layer = st.project.frames[fi]?.layers[li];
      if (layer) {
        const strokes = [...layer.strokes];
        tf.indices.forEach((idx, k) => {
          if (idx < strokes.length) strokes[idx] = tf.base[k];
        });
        setStrokesLive(fi, li, strokes);
      }
    }
    transformRef.current = null;
    transformDrag.current = null;
    setTransformActive(false);
  }, [setStrokesLive]);

  // ---- Overlay de seleção (bbox tracejada + handles) ----
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (tool !== 'select' && !transformActive) return;
    if (isDrawing.current || isShapeDrawing.current || selDrag.current?.mode === 'marquee') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const layer = project.frames[project.currentFrameIndex]?.layers[project.currentLayerIndex];
    if (!layer || !selection || selection.length === 0) return;
    const bbox = selectionBBox(layer.strokes, selection);
    if (!bbox) return;
    drawSelectionOverlay(ctx, bbox, zoom, transformActive);
  }, [selection, project, tool, transformActive, zoom]);

  // Limpa o overlay ao sair da ferramenta seleção
  useEffect(() => {
    if (tool === 'select' || transformActive) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [tool, transformActive]);

  // ---- Handlers da ferramenta Selecionar / Transformação ----
  const handleSelectPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const point = getCanvasCoordinates(e, canvas, zoom, pan);
      e.currentTarget.setPointerCapture(e.pointerId);

      const st = useStore.getState();
      const layer =
        st.project.frames[st.project.currentFrameIndex]?.layers[st.project.currentLayerIndex];
      if (!layer) return;

      const { indices, strokes } = getSelectedStrokes();

      // Se já temos seleção ativa ou modo transformação
      if (indices.length > 0) {
        const bbox = selectionBBox(layer.strokes, indices);
        if (bbox) {
          // Alt / Option + clique/arrasto = duplicar a seleção antes de manipular!
          if (e.altKey) {
            st.copySelection();
            st.pasteClipboard();
          }

          for (const h of getHandles(bbox, zoom)) {
            const hitTol = (h.id === 'rot' ? 18 : 14) / zoom;
            const dist = Math.hypot(point.x - h.x, point.y - h.y);
            if (dist <= hitTol) {
              transformRef.current = { indices, base: strokes, changed: false };
              setTransformActive(true);
              transformDrag.current = {
                kind: h.id === 'rot' ? 'rotate' : 'scale',
                handle: h.id,
                start: point,
                fixed: h.id === 'rot' ? bboxCenter(bbox) : oppositeHandlePoint(h.id, bbox),
                pushedUndo: false,
              };
              return;
            }
          }

          // Clique dentro da bounding box (sem acertar os handles) => mover seleção
          if (pointInBBox(point, bbox, 6 / zoom)) {
            transformRef.current = { indices, base: strokes, changed: false };
            setTransformActive(true);
            transformDrag.current = {
              kind: 'move',
              handle: null,
              start: point,
              fixed: bboxCenter(bbox),
              pushedUndo: false,
            };
            return;
          }
        }
      }

      // Clique em um traço individual para selecionar e transformar
      let clickedIndex = -1;
      for (let i = layer.strokes.length - 1; i >= 0; i--) {
        const b = strokeBBox(layer.strokes[i]);
        if (b && pointInBBox(point, b, 6 / zoom)) {
          clickedIndex = i;
          break;
        }
      }

      if (clickedIndex >= 0) {
        const hitIndices = [clickedIndex];
        setSelection(hitIndices);
        const singleStrokes = [layer.strokes[clickedIndex]];
        transformRef.current = { indices: hitIndices, base: singleStrokes, changed: false };
        setTransformActive(true);
        const bbox = selectionBBox(layer.strokes, hitIndices);
        if (bbox) {
          transformDrag.current = {
            kind: 'move',
            handle: null,
            start: point,
            fixed: bboxCenter(bbox),
            pushedUndo: false,
          };
        }
        return;
      }

      // Inicia caixa de seleção (marquee)
      cancelTransform();
      setSelection(null);
      selDrag.current = { mode: 'marquee', start: point, indices: [], base: [], pushedUndo: false };
    },
    [zoom, pan, getSelectedStrokes, cancelTransform, setSelection]
  );

  const handleSelectPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const point = getCanvasCoordinates(e, canvas, zoom, pan);
      const st = useStore.getState();
      const fi = st.project.currentFrameIndex;
      const li = st.project.currentLayerIndex;

      // Arrasto de transformação
      const td = transformDrag.current;
      const tf = transformRef.current;
      if (td && tf) {
        if (!td.pushedUndo) {
          pushUndo(fi, li);
          td.pushedUndo = true;
          tf.changed = true;
        }
        let m: Affine;
        if (td.kind === 'move') {
          m = translation(point.x - td.start.x, point.y - td.start.y);
        } else if (td.kind === 'rotate') {
          let ang =
            Math.atan2(point.y - td.fixed.y, point.x - td.fixed.x) -
            Math.atan2(td.start.y - td.fixed.y, td.start.x - td.fixed.x);
          if (e.shiftKey) {
            ang = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12); // trava em 15°
          }
          m = rotationAbout(td.fixed.x, td.fixed.y, ang);
        } else {
          const h = td.handle!;
          const affectsX = h !== 'n' && h !== 's';
          const affectsY = h !== 'e' && h !== 'w';
          const denX = td.start.x - td.fixed.x;
          const denY = td.start.y - td.fixed.y;
          let sx = affectsX && Math.abs(denX) > 1e-6 ? (point.x - td.fixed.x) / denX : 1;
          let sy = affectsY && Math.abs(denY) > 1e-6 ? (point.y - td.fixed.y) / denY : 1;
          if (e.shiftKey && affectsX && affectsY) {
            // cantos com Shift: escala estritamente proporcional
            const scale = Math.max(Math.abs(sx), Math.abs(sy));
            sx = Math.sign(sx || 1) * scale;
            sy = Math.sign(sy || 1) * scale;
          }
          m = scaleAbout(td.fixed.x, td.fixed.y, sx, sy);
        }
        applyLiveToSelection(tf.indices, tf.base.map((s) => transformStroke(s, m)));
        return;
      }

      // Arrasto de seleção
      const drag = selDrag.current;
      if (!drag) return;

      if (drag.mode === 'marquee') {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.strokeStyle = '#f5c518';
        ctx.fillStyle = 'rgba(245,197,24,0.12)';
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        const x = Math.min(drag.start.x, point.x);
        const y = Math.min(drag.start.y, point.y);
        const w = Math.abs(point.x - drag.start.x);
        const h = Math.abs(point.y - drag.start.y);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
        return;
      }
    },
    [zoom, pan, pushUndo, applyLiveToSelection]
  );

  const handleSelectPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      // Fim de arrasto de transformação
      if (transformDrag.current) {
        transformDrag.current = null;
        const { strokes } = getSelectedStrokes();
        if (transformRef.current && strokes.length > 0) {
          transformRef.current.base = strokes;
        }
        return;
      }

      const drag = selDrag.current;
      if (!drag) return;
      selDrag.current = null;

      // Marquee: calcula interseções
      const point = getCanvasCoordinates(e, canvas, zoom, pan);
      const rect: BBox = {
        minX: Math.min(drag.start.x, point.x),
        minY: Math.min(drag.start.y, point.y),
        maxX: Math.max(drag.start.x, point.x),
        maxY: Math.max(drag.start.y, point.y),
      };

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

      const st = useStore.getState();
      const layer =
        st.project.frames[st.project.currentFrameIndex]?.layers[st.project.currentLayerIndex];
      if (!layer) return;

      const indices: number[] = [];
      layer.strokes.forEach((s, i) => {
        const b = strokeBBox(s);
        if (b && intersectsBBox(b, rect)) indices.push(i);
      });

      if (indices.length > 0) {
        setSelection(indices);
        transformRef.current = {
          indices,
          base: indices.map((i) => layer.strokes[i]),
          changed: false,
        };
        setTransformActive(true);
      } else {
        setSelection(null);
        cancelTransform();
      }
    },
    [zoom, pan, setSelection, cancelTransform]
  );

  // ---- Teclado: seleção, clipboard, transformação ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const st = useStore.getState();
      const hasSel = !!st.selection && st.selection.length > 0;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();


      if (transformRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitTransform();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelTransform();
        }
        return;
      }

      if (e.key === 'Escape' && hasSel) {
        st.setSelection(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSel) {
        e.preventDefault();
        st.deleteSelection();
        return;
      }
      if (mod && key === 'c') {
        // copia a seleção; sem seleção, copia a camada inteira
        if (st.copySelection() > 0) e.preventDefault();
        return;
      }
      if (mod && key === 'x') {
        if (st.cutSelection() > 0) e.preventDefault();
        return;
      }
      if (mod && key === 'v') {
        if (st.clipboard && st.clipboard.length > 0) {
          e.preventDefault();
          st.pasteClipboard();
        }
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [startTransform, commitTransform, cancelTransform]);



  // Zoom via trackpad (pinch detection via wheel with ctrl/meta)
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(Math.min(Math.max(zoom * delta, 0.05), 10));
        return;
      }

      // Shift + scroll = pan horizontal (comportamento típico)
      if (e.shiftKey && e.deltaX === 0) {
        setPan({ x: pan.x - e.deltaY, y: pan.y });
        return;
      }

      setPan({ x: pan.x - e.deltaX, y: pan.y - e.deltaY });
    },
    [zoom, pan, setZoom, setPan]
  );

  // Conta-gotas: lê a cor composta do canvas principal
  const pickColor = useCallback(
    (point: Point) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(point.x)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(point.y)));
      const data = ctx.getImageData(x, y, 1, 1).data;
      const hex =
        '#' +
        [data[0], data[1], data[2]]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('');
      setBrush({ color: hex });
    },
    [setBrush]
  );

  const commitStroke = useCallback(
    (stroke: Stroke) => {
      addStroke(project.currentFrameIndex, project.currentLayerIndex, stroke);
    },
    [addStroke, project.currentFrameIndex, project.currentLayerIndex]
  );

  const handleCanvasDoubleClick = useCallback(() => {
    if (!showGrid) return;
    const currentSize = project.gridSize || 50;
    const val = prompt('Definir tamanho da grade / grid (px):', String(currentSize));
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 4 && num <= 500) {
        updateProject({ gridSize: num });
      }
    }
  }, [showGrid, project.gridSize, updateProject]);

  const snapPointToGrid = useCallback(
    (pt: Point): Point => {
      if (!showGrid) return pt;
      const g = project.gridSize || 50;
      if (Math.abs(brush.size - g) <= 4 || brush.size % g === 0) {
        return {
          ...pt,
          x: Math.floor(pt.x / g) * g,
          y: Math.floor(pt.y / g) * g,
        };
      }
      return pt;
    },
    [showGrid, project.gridSize, brush.size]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!currentLayer || tool === 'move') return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      let point = getCanvasCoordinates(e, canvas, zoom, pan);
      point = snapPointToGrid(point);

      // Alt + clique = conta-gotas
      if (e.altKey) {
        pickColor(point);
        return;
      }

      if (isShapeTool) {
        isShapeDrawing.current = true;
        shapeStart.current = snapPoint(point);
        shapeEnd.current = shapeStart.current;
        return;
      }

      if (tool === 'fill') {
        commitStroke({
          points: [point],
          color: brush.color,
          size: brush.size,
          tool: 'fill',
          opacity: brush.opacity,
          fillType: brush.fillType || 'solid',
          gradientColors: brush.gradientColors,
        });
        return;
      }

      // Shift + clique com pincel/borracha = linha reta desde o fim do último traço
      if (
        e.shiftKey &&
        lastStrokeEnd.current &&
        (tool === 'brush' || tool === 'hard-brush' || tool === 'eraser')
      ) {
        commitStroke({
          points: [lastStrokeEnd.current, point],
          color: brush.color,
          size: brush.size,
          tool,
          opacity: brush.opacity,
        });
        lastStrokeEnd.current = point;
        return;
      }

      isDrawing.current = true;
      currentStroke.current = [point];

      // clique sem arrastar: desenha um ponto
      const ctx = canvas.getContext('2d');
      if (ctx && (tool === 'brush' || tool === 'hard-brush' || tool === 'eraser')) {
        if (tool === 'eraser') {
          const mainCtx = canvasRef.current?.getContext('2d');
          if (mainCtx) {
            mainCtx.save();
            mainCtx.globalCompositeOperation = 'destination-out';
            mainCtx.beginPath();
            mainCtx.arc(point.x, point.y, brush.size / 2, 0, Math.PI * 2);
            mainCtx.fill();
            mainCtx.restore();
          }
        } else if (tool === 'hard-brush') {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          const r = Math.max(1, Math.round(brush.size / 2));
          ctx.fillStyle = hexToRgba(brush.color, brush.opacity);
          ctx.fillRect(Math.round(point.x - r), Math.round(point.y - r), r * 2, r * 2);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(point.x, point.y, brush.size / 2, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(brush.color, brush.opacity);
          ctx.fill();
        }
      }
    },
    [currentLayer, tool, brush, zoom, pan, commitStroke, pickColor, isShapeTool, snapPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      let point = getCanvasCoordinates(e, canvas, zoom, pan);
      point = snapPointToGrid(point);

      if (isShapeDrawing.current && shapeStart.current && isShapeTool) {
        point = snapPoint(point);
        if (e.shiftKey) {
          point = constrainPoint(tool, shapeStart.current, point);
        }
        shapeEnd.current = point;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawShapeOnContext(ctx, tool, shapeStart.current, point, brush);
        }
        return;
      }

      if (!isDrawing.current || !currentLayer) return;
      if (tool === 'fill' || tool === 'move') return;

      currentStroke.current.push(point);

      const points = currentStroke.current;
      if (points.length >= 2) {
        const p = points[points.length - 1];
        const prev = points[points.length - 2];

        if (tool === 'eraser') {
          const mainCtx = canvasRef.current?.getContext('2d');
          if (mainCtx) {
            mainCtx.save();
            mainCtx.globalCompositeOperation = 'destination-out';
            mainCtx.beginPath();
            mainCtx.moveTo(prev.x, prev.y);
            mainCtx.lineTo(p.x, p.y);
            mainCtx.strokeStyle = 'rgba(0,0,0,1)';
            mainCtx.lineWidth = brush.size;
            mainCtx.lineCap = 'round';
            mainCtx.lineJoin = 'round';
            mainCtx.stroke();
            mainCtx.restore();
          }
        } else if (tool === 'hard-brush') {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.beginPath();
          ctx.moveTo(Math.round(prev.x), Math.round(prev.y));
          ctx.lineTo(Math.round(p.x), Math.round(p.y));
          ctx.strokeStyle = hexToRgba(brush.color, brush.opacity);
          ctx.lineWidth = Math.max(1, Math.round(brush.size));
          ctx.lineCap = 'square';
          ctx.lineJoin = 'miter';
          ctx.stroke();
          ctx.restore();
        } else {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = hexToRgba(brush.color, brush.opacity);
          ctx.lineWidth = brush.size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      }
    },
    [currentLayer, tool, brush, zoom, pan, isShapeTool, snapPoint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      // Finalizar forma geométrica
      if (isShapeDrawing.current && shapeStart.current && isShapeTool) {
        let end = shapeEnd.current ?? getCanvasCoordinates(e, canvas, zoom, pan);
        end = snapPoint(end);
        if (e.shiftKey) {
          end = constrainPoint(tool, shapeStart.current, end);
        }

        // evita formas degeneradas (clique sem arrastar)
        const moved =
          Math.abs(end.x - shapeStart.current.x) > 0.5 ||
          Math.abs(end.y - shapeStart.current.y) > 0.5;

        if (moved && currentLayer) {
          const pts =
            tool === 'line'
              ? [shapeStart.current, end]
              : shapeCornerPoints(shapeStart.current, end);
          commitStroke({
            points: pts,
            startPoint: shapeStart.current,
            endPoint: end,
            color: brush.color,
            size: brush.size,
            tool,
            opacity: brush.opacity,
            filled: brush.filled,
            fillColor: brush.fillColor,
          });
        }

        isShapeDrawing.current = false;
        shapeStart.current = null;
        shapeEnd.current = null;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      if (!isDrawing.current || !currentLayer) return;
      if (tool === 'fill' || tool === 'move') return;

      isDrawing.current = false;
      const points = currentStroke.current;
      if (points.length === 0) return;

      commitStroke({
        points,
        color: brush.color,
        size: brush.size,
        tool,
        opacity: brush.opacity,
      });
      lastStrokeEnd.current = points[points.length - 1];
      currentStroke.current = [];

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    [currentLayer, tool, brush, zoom, pan, commitStroke, isShapeTool, snapPoint]
  );

  // Pan (ferramenta mão, ou Cmd/Ctrl + arrastar em qualquer ferramenta)
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const panStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanGesture = useRef(false);

  const handleMovePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      panStart.current = { x: e.clientX, y: e.clientY };
      panStartOffset.current = { ...pan };
      isPanGesture.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handleMovePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!panStart.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStartOffset.current.x + dx, y: panStartOffset.current.y + dy });
    },
    [setPan]
  );

  const handleMovePointerUp = useCallback(() => {
    panStart.current = null;
    isPanGesture.current = false;
  }, []);

  // Roteamento: transformação/seleção primeiro; Cmd/Ctrl + arrastar = pan temporário
  const getPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (transformRef.current || tool === 'select') {
      handleSelectPointerDown(e);
      return;
    }
    if (tool === 'move' || e.ctrlKey || e.metaKey) {
      handleMovePointerDown(e);
      return;
    }
    handlePointerDown(e);
  };

  const getPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (transformDrag.current || selDrag.current) {
      handleSelectPointerMove(e);
      return;
    }
    if (isPanGesture.current) {
      handleMovePointerMove(e);
      return;
    }
    handlePointerMove(e);
  };

  const getPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (transformDrag.current || selDrag.current) {
      handleSelectPointerUp(e);
      return;
    }
    if (isPanGesture.current) {
      handleMovePointerUp();
      return;
    }
    handlePointerUp(e);
  };

  // Cursor conforme ferramenta
  useEffect(() => {
    if (tool === 'move') setCursor('grab');
    else if (tool === 'select') setCursor('default');
    else setCursor('crosshair');
  }, [tool]);

  // ---- Réguas: arrastar para criar guias ----
  const rulerDrag = useRef<{ axis: 'x' | 'y'; index: number } | null>(null);

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - cx - pan.x) / zoom + project.width / 2,
        y: (sy - cy - pan.y) / zoom + project.height / 2,
      };
    },
    [pan, zoom, project.width, project.height]
  );

  const handleRulerDown = useCallback(
    (axis: 'x' | 'y') => (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = screenToCanvas(e.clientX, e.clientY);
      const pos = axis === 'x' ? p.x : p.y;
      const limit = axis === 'x' ? project.width : project.height;
      const index = addGuide(axis, Math.max(0, Math.min(limit, pos)));
      rulerDrag.current = { axis, index };
    },
    [screenToCanvas, addGuide, project.width, project.height]
  );

  const handleRulerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = rulerDrag.current;
      if (!drag) return;
      const p = screenToCanvas(e.clientX, e.clientY);
      const pos = drag.axis === 'x' ? p.x : p.y;
      const limit = drag.axis === 'x' ? project.width : project.height;
      moveGuide(drag.axis, drag.index, Math.max(0, Math.min(limit, pos)));
    },
    [screenToCanvas, moveGuide, project.width, project.height]
  );

  const handleRulerUp = useCallback(() => {
    rulerDrag.current = null;
  }, []);

  // ---- Guias: arrastar para mover, duplo clique para remover ----
  const handleGuideDown = useCallback(
    (axis: 'x' | 'y', index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragGuide.current = { axis, index };
    },
    []
  );

  const handleGuideMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragGuide.current;
      if (!drag) return;
      const p = screenToCanvas(e.clientX, e.clientY);
      const pos = drag.axis === 'x' ? p.x : p.y;
      const limit = drag.axis === 'x' ? project.width : project.height;
      moveGuide(drag.axis, drag.index, Math.max(0, Math.min(limit, pos)));
    },
    [screenToCanvas, moveGuide, project.width, project.height]
  );

  const handleGuideUp = useCallback(() => {
    dragGuide.current = null;
  }, []);

  const handleGuideDoubleClick = useCallback(
    (axis: 'x' | 'y', index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      removeGuide(axis, index);
    },
    [removeGuide]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onWheel={handleWheel}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          className="relative"
          style={{ width: project.width, height: project.height, flexShrink: 0 }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{
              width: project.width,
              height: project.height,
              imageRendering: 'pixelated',
            }}
          />
          <canvas
            ref={drawingCanvasRef}
            className="absolute inset-0"
            width={project.width}
            height={project.height}
            style={{
              width: project.width,
              height: project.height,
              imageRendering: 'pixelated',
              cursor,
            }}
            onPointerDown={getPointerDown}
            onPointerMove={getPointerMove}
            onPointerUp={getPointerUp}
            onDoubleClick={handleCanvasDoubleClick}
          />

          {/* Guias (1px Rosa) */}
          {showGuides &&
            guides.x.map((gx, i) => (
              <div
                key={`gx-${i}`}
                className="absolute top-0"
                style={{
                  left: gx - 3,
                  width: 7,
                  height: project.height,
                  cursor: 'ew-resize',
                  pointerEvents: 'auto',
                }}
                onPointerDown={handleGuideDown('x', i)}
                onPointerMove={handleGuideMove}
                onPointerUp={handleGuideUp}
                onDoubleClick={handleGuideDoubleClick('x', i)}
                title="Arraste para mover • Duplo clique para remover"
              >
                <div
                  className="mx-auto h-full"
                  style={{ width: 1, background: '#ff007f', boxShadow: '0 0 2px rgba(255,0,127,0.8)' }}
                />
              </div>
            ))}
          {showGuides &&
            guides.y.map((gy, i) => (
              <div
                key={`gy-${i}`}
                className="absolute left-0"
                style={{
                  top: gy - 3,
                  height: 7,
                  width: project.width,
                  cursor: 'ns-resize',
                  pointerEvents: 'auto',
                }}
                onPointerDown={handleGuideDown('y', i)}
                onPointerMove={handleGuideMove}
                onPointerUp={handleGuideUp}
                onDoubleClick={handleGuideDoubleClick('y', i)}
                title="Arraste para mover • Duplo clique para remover"
              >
                <div
                  className="my-auto w-full"
                  style={{ height: 1, background: '#ff007f', boxShadow: '0 0 2px rgba(255,0,127,0.8)' }}
                />
              </div>
            ))}
        </div>
      </div>

      {/* Réguas */}
      <CanvasRulers
        showRulers={showRulers}
        zoom={zoom}
        pan={pan}
        projectWidth={project.width}
        projectHeight={project.height}
        containerRef={containerRef}
        topRulerRef={topRulerRef}
        leftRulerRef={leftRulerRef}
        onRulerPointerDown={handleRulerDown}
        onRulerPointerMove={handleRulerMove}
        onRulerPointerUp={handleRulerUp}
      />
    </div>
  );
}
