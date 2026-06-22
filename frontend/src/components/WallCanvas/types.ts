import type { Canvas, FabricObject, Group } from 'fabric';
import type { ToolType } from './WallCanvasToolbar';
import type { Route } from '@/types';

export interface RoutePoint {
  x: number;
  y: number;
  type: 'start' | 'hold' | 'end';
}

export interface RouteWithPoints extends Omit<Route, 'holds'> {
  points: RoutePoint[];
}

export interface FabricObjectWithData extends FabricObject {
  data?: Record<string, unknown>;
}

export interface CanvasContext {
  canvas: Canvas;
  routes: RouteWithPoints[];
  selectedRouteId: number | null;
  editingRouteId: number | null;
  activeTool: ToolType;
  selectedPointIndex: number | null;
  isEditable: boolean;
  wallWidth: number;
  wallHeight: number;
  routeGroups: Map<number, Group>;
  routeIdMap: Map<Group, number>;
}

export interface CanvasState {
  routes: RouteWithPoints[];
  selectedRouteId: number | null;
  editingRouteId: number | null;
  activeTool: ToolType;
  selectedPointIndex: number | null;
  zoom: number;
  history: RoutePoint[][];
}

export type EventName =
  | 'canvas:click'
  | 'canvas:mouse:down'
  | 'canvas:mouse:move'
  | 'canvas:mouse:up'
  | 'canvas:mouse:wheel'
  | 'route:update'
  | 'route:select'
  | 'point:add'
  | 'point:delete'
  | 'zoom:change'
  | 'tool:change'
  | 'history:undo'
  | 'history:push'
  | 'render'
  | 'canvas:init';

export interface EventDataMap {
  'canvas:click': { e: MouseEvent; pointer: { x: number; y: number }; target?: FabricObject };
  'canvas:mouse:down': { e: MouseEvent; pointer: { x: number; y: number } };
  'canvas:mouse:move': { e: MouseEvent; pointer: { x: number; y: number } };
  'canvas:mouse:up': { e: MouseEvent };
  'canvas:mouse:wheel': { e: WheelEvent; pointer: { x: number; y: number }; delta: number };
  'route:update': { routeId: number; points: RoutePoint[] };
  'route:select': { routeId: number | null };
  'point:add': { routeId: number; point: RoutePoint };
  'point:delete': { routeId: number; pointIndex: number };
  'zoom:change': { zoom: number };
  'tool:change': { tool: ToolType };
  'history:undo': undefined;
  'history:push': { points: RoutePoint[] };
  'render': undefined;
  'canvas:init': { canvas: Canvas };
}

export type EventHandler<T extends EventName> = (
  data: EventDataMap[T],
  context: CanvasContext,
  helpers: PluginHelpers
) => void | boolean | Promise<void | boolean>;

export interface PluginHelpers {
  getState: () => CanvasState;
  setState: (state: Partial<CanvasState>) => void;
  emit: <T extends EventName>(event: T, data: EventDataMap[T]) => void;
  getEditingPoints: () => RoutePoint[];
  rerender: () => void;
}

export interface WallCanvasPlugin {
  name: string;
  priority?: number;
  init?: (context: CanvasContext, helpers: PluginHelpers) => void;
  on?: {
    [T in EventName]?: EventHandler<T>;
  };
  destroy?: () => void;
}

export interface PluginManager {
  register: (plugin: WallCanvasPlugin) => void;
  unregister: (pluginName: string) => void;
  emit: <T extends EventName>(event: T, data: EventDataMap[T]) => void;
  destroy: () => void;
  initPlugins: (canvas: Canvas) => void;
}

export const HOLD_RADIUS = 8;
export const START_COLOR = '#22C55E';
export const END_COLOR = '#EF4444';
export const HOLD_STROKE_COLOR = '#ffffff';
export const HOLD_STROKE_WIDTH = 2;
export const LINE_WIDTH = 3;
export const LINE_OPACITY = 0.8;
