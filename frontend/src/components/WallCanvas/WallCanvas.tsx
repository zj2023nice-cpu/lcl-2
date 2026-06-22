import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, Rect, Line, Gradient, Group } from 'fabric';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import WallCanvasToolbar, { ToolType } from './WallCanvasToolbar';
import { createPluginManager } from './pluginManager';
import { HoldDrawingPlugin } from './plugins/HoldDrawingPlugin';
import { RouteLineDrawingPlugin } from './plugins/RouteLineDrawingPlugin';
import { RouteDrawingPlugin } from './plugins/RouteDrawingPlugin';
import { HitDetectionPlugin } from './plugins/HitDetectionPlugin';
import { UndoRedoPlugin } from './plugins/UndoRedoPlugin';
import { ZoomPanPlugin } from './plugins/ZoomPanPlugin';
import { ZoomControlsPlugin, handleZoomIn, handleZoomOut, handleZoomReset } from './plugins/ZoomControlsPlugin';
import type { CanvasState, CanvasContext, WallCanvasPlugin, RoutePoint, RouteWithPoints } from './types';
export type { RoutePoint, RouteWithPoints } from './types';

const defaultPlugins: WallCanvasPlugin[] = [
  RouteLineDrawingPlugin,
  HoldDrawingPlugin,
  RouteDrawingPlugin,
  HitDetectionPlugin,
  UndoRedoPlugin,
  ZoomPanPlugin,
  ZoomControlsPlugin,
];

interface WallCanvasProps {
  wallId?: number;
  routes: RouteWithPoints[];
  selectedRouteId?: number | null;
  onRouteSelect?: (routeId: number | null) => void;
  onRouteUpdate?: (routeId: number, points: RoutePoint[]) => void;
  onZoomChange?: (zoom: number) => void;
  isEditable?: boolean;
  wallWidth?: number;
  wallHeight?: number;
  className?: string;
  plugins?: WallCanvasPlugin[];
}

export default function WallCanvas({
  routes,
  selectedRouteId,
  onRouteSelect,
  onRouteUpdate,
  onZoomChange,
  isEditable = false,
  wallWidth = 800,
  wallHeight = 600,
  className,
  plugins = defaultPlugins,
}: WallCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const pluginManagerRef = useRef<ReturnType<typeof createPluginManager> | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<RoutePoint[][]>([]);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const holdGroupsRef = useRef<Map<number, Group>>(new Map());
  const lineGroupsRef = useRef<Map<number, Group>>(new Map());
  const routeIdMapRef = useRef<Map<Group, number>>(new Map());
  const pendingEditRouteIdRef = useRef<number | null>(null);

  const getState = useCallback((): CanvasState => ({
    routes,
    selectedRouteId: selectedRouteId ?? null,
    editingRouteId,
    activeTool,
    selectedPointIndex,
    zoom,
    history,
  }), [routes, selectedRouteId, editingRouteId, activeTool, selectedPointIndex, zoom, history]);

  const setState = useCallback((state: Partial<CanvasState>) => {
    if (state.activeTool !== undefined) setActiveTool(state.activeTool);
    if (state.zoom !== undefined) setZoom(state.zoom);
    if (state.history !== undefined) setHistory(state.history);
    if (state.editingRouteId !== undefined) setEditingRouteId(state.editingRouteId);
    if (state.selectedPointIndex !== undefined) setSelectedPointIndex(state.selectedPointIndex);
  }, []);

  const getContext = useCallback((): Omit<CanvasContext, 'canvas'> & { canvas: Canvas | null } => ({
    canvas: fabricCanvasRef.current,
    routes,
    selectedRouteId: selectedRouteId ?? null,
    editingRouteId,
    activeTool,
    selectedPointIndex,
    isEditable,
    wallWidth,
    wallHeight,
    holdGroups: holdGroupsRef.current,
    lineGroups: lineGroupsRef.current,
    routeIdMap: routeIdMapRef.current,
  }), [routes, selectedRouteId, editingRouteId, activeTool, selectedPointIndex, isEditable, wallWidth, wallHeight]);

  const pluginManager = useMemo(() => {
    const manager = createPluginManager(
      getContext,
      getState,
      setState,
      onRouteUpdate,
      onRouteSelect,
      onZoomChange
    );
    return manager;
  }, [getContext, getState, setState, onRouteUpdate, onRouteSelect, onZoomChange]);

  useEffect(() => {
    pluginManagerRef.current = pluginManager;
    plugins.forEach((p) => pluginManager.register(p));

    return () => {
      pluginManager.destroy();
    };
  }, [pluginManager, plugins]);

  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: wallWidth,
      height: wallHeight,
      backgroundColor: '#1a1a1a',
      selection: isEditable,
      preserveObjectStacking: true,
    });

    const gradient = new Rect({
      left: 0,
      top: 0,
      width: wallWidth,
      height: wallHeight,
      selectable: false,
      evented: false,
      fill: new Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: wallHeight },
        colorStops: [
          { offset: 0, color: '#2d2d2d' },
          { offset: 0.5, color: '#1f1f1f' },
          { offset: 1, color: '#141414' },
        ],
      }),
    });
    canvas.add(gradient);

    const gridSize = 50;
    for (let x = 0; x <= wallWidth; x += gridSize) {
      const line = new Line([x, 0, x, wallHeight], {
        stroke: '#333333',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(line);
    }
    for (let y = 0; y <= wallHeight; y += gridSize) {
      const line = new Line([0, y, wallWidth, y], {
        stroke: '#333333',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(line);
    }

    fabricCanvasRef.current = canvas;
    pluginManagerRef.current?.initPlugins(canvas);
    pluginManagerRef.current?.emit('canvas:init', { canvas });
    pluginManagerRef.current?.emit('render', undefined);
  }, [wallWidth, wallHeight, isEditable]);

  const handleCanvasClick = useCallback((options: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(options.e);
    pluginManagerRef.current?.emit('canvas:click', {
      e: options.e,
      pointer,
      target: options.target,
    });
  }, []);

  const handleCanvasMouseDown = useCallback((opt: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(opt.e);
    pluginManagerRef.current?.emit('canvas:mouse:down', {
      e: opt.e,
      pointer,
    });
  }, []);

  const handleCanvasMouseMove = useCallback((opt: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(opt.e);
    pluginManagerRef.current?.emit('canvas:mouse:move', {
      e: opt.e,
      pointer,
    });
  }, []);

  const handleCanvasMouseUp = useCallback((opt: any) => {
    pluginManagerRef.current?.emit('canvas:mouse:up', {
      e: opt.e,
    });
  }, []);

  const handleCanvasWheel = useCallback((opt: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(opt.e);
    pluginManagerRef.current?.emit('canvas:mouse:wheel', {
      e: opt.e,
      pointer,
      delta: opt.e.deltaY,
    });
  }, []);

  useEffect(() => {
    initCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [initCanvas]);

  useEffect(() => {
    pluginManagerRef.current?.emit('render', undefined);
  }, [routes, selectedRouteId]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.on('mouse:down', handleCanvasClick);
    canvas.on('mouse:down', handleCanvasMouseDown);
    canvas.on('mouse:move', handleCanvasMouseMove);
    canvas.on('mouse:up', handleCanvasMouseUp);
    canvas.on('mouse:wheel', handleCanvasWheel);

    return () => {
      canvas.off('mouse:down', handleCanvasClick);
      canvas.off('mouse:down', handleCanvasMouseDown);
      canvas.off('mouse:move', handleCanvasMouseMove);
      canvas.off('mouse:up', handleCanvasMouseUp);
      canvas.off('mouse:wheel', handleCanvasWheel);
    };
  }, [handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleCanvasWheel]);

  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    if (tool !== 'select' && selectedRouteId && !editingRouteId) {
      setEditingRouteId(selectedRouteId);
      pendingEditRouteIdRef.current = selectedRouteId;
    }
    pluginManagerRef.current?.emit('tool:change', { tool });
  }, [selectedRouteId, editingRouteId]);

  const handleDelete = useCallback(() => {
    if (!editingRouteId && !selectedRouteId) return;

    const routeId = editingRouteId || selectedRouteId || 0;

    if (selectedPointIndex !== null) {
      pluginManagerRef.current?.emit('point:delete', {
        routeId,
        pointIndex: selectedPointIndex,
      });
    }
  }, [editingRouteId, selectedRouteId, selectedPointIndex]);

  const handleUndo = useCallback(() => {
    pluginManagerRef.current?.emit('history:undo', undefined);
  }, []);

  const handleZoomInClick = useCallback(() => {
    const newZoom = handleZoomIn(zoom);
    setZoom(newZoom);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.setZoom(newZoom);
    }
    onZoomChange?.(newZoom);
    pluginManagerRef.current?.emit('zoom:change', { zoom: newZoom });
  }, [zoom, onZoomChange]);

  const handleZoomOutClick = useCallback(() => {
    const newZoom = handleZoomOut(zoom);
    setZoom(newZoom);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.setZoom(newZoom);
    }
    onZoomChange?.(newZoom);
    pluginManagerRef.current?.emit('zoom:change', { zoom: newZoom });
  }, [zoom, onZoomChange]);

  const handleZoomResetClick = useCallback(() => {
    const newZoom = handleZoomReset();
    setZoom(newZoom);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.setZoom(newZoom);
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    }
    onZoomChange?.(newZoom);
    pluginManagerRef.current?.emit('zoom:change', { zoom: newZoom });
  }, [onZoomChange]);

  return (
    <div className={cn('relative w-full h-full', className)}>
      {isEditable && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <WallCanvasToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onDelete={handleDelete}
            onUndo={handleUndo}
            onZoomIn={handleZoomInClick}
            onZoomOut={handleZoomOutClick}
            onZoomReset={handleZoomResetClick}
            canUndo={history.length > 0}
            canDelete={selectedPointIndex !== null}
          />
        </div>
      )}

      {!isEditable && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 p-2 bg-theme-card/90 backdrop-blur-sm rounded-xl border border-theme-border shadow-xl">
          <button
            onClick={handleZoomOutClick}
            title="缩小"
            className="p-2.5 rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-hover transition-all duration-200"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleZoomResetClick}
            title="还原"
            className="p-2.5 rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-hover transition-all duration-200"
          >
            <Maximize2 size={18} />
          </button>
          <button
            onClick={handleZoomInClick}
            title="放大"
            className="p-2.5 rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-hover transition-all duration-200"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      )}

      <div className="w-full h-full overflow-hidden bg-theme-subtle rounded-xl">
        <canvas ref={canvasRef} />
      </div>

      <div className="absolute bottom-4 right-4 text-xs text-theme-text-muted bg-theme-card/80 px-3 py-1.5 rounded-lg">
        {Math.round(zoom * 100)}%
      </div>

      {!isEditable && routes.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-theme-card/90 backdrop-blur-sm rounded-lg p-3 border border-theme-border">
          <div className="flex items-center gap-2 text-xs text-theme-text-secondary mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>起点</span>
            <div className="w-3 h-3 rounded-full bg-red-500 ml-2" />
            <span>终点</span>
          </div>
          <p className="text-xs text-theme-text-muted">滚轮缩放 · Shift+拖拽平移</p>
        </div>
      )}
    </div>
  );
}

export { WallCanvasToolbar };

