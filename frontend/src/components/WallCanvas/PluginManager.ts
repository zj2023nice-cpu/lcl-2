import type { Canvas } from 'fabric';
import type {
  WallCanvasPlugin,
  PluginManager,
  CanvasContext,
  CanvasState,
  EventName,
  EventDataMap,
  RoutePoint,
  RouteWithPoints,
} from './types';
import type { ToolType } from './WallCanvasToolbar';

export function createPluginManager(
  getContext: () => Omit<CanvasContext, 'canvas'> & { canvas: Canvas | null },
  getState: () => CanvasState,
  setState: (state: Partial<CanvasState>) => void,
  onRouteUpdate?: (routeId: number, points: RoutePoint[]) => void,
  onRouteSelect?: (routeId: number | null) => void,
  onZoomChange?: (zoom: number) => void
): PluginManager {
  const plugins: Map<string, WallCanvasPlugin> = new Map();
  const sortedPlugins: WallCanvasPlugin[] = [];

  const sortPlugins = () => {
    sortedPlugins.length = 0;
    sortedPlugins.push(...Array.from(plugins.values()).sort((a, b) => (b.priority || 0) - (a.priority || 0)));
  };

  const getEditingPoints = (): RoutePoint[] => {
    const state = getState();
    const editingId = state.editingRouteId || state.selectedRouteId;
    if (!editingId) return [];
    const route = getContext().routes.find((r) => r.id === editingId);
    return route ? [...route.points] : [];
  };

  const rerender = () => {
    emit('render', undefined);
  };

  const emit = <T extends EventName>(event: T, data: EventDataMap[T]) => {
    const ctx = getContext();
    if (!ctx.canvas && event !== 'canvas:init') return;

    const context = ctx as CanvasContext;
    const helpers = {
      getState,
      setState,
      emit,
      getEditingPoints,
      rerender,
    };

    for (const plugin of sortedPlugins) {
      if (plugin.on && plugin.on[event]) {
        const handler = plugin.on[event] as any;
        const result = handler(data, context, helpers);
        if (result === false) {
          break;
        }
      }
    }

    if (event === 'route:update') {
      const { routeId, points } = data as EventDataMap['route:update'];
      onRouteUpdate?.(routeId, points);
    }
    if (event === 'route:select') {
      const { routeId } = data as EventDataMap['route:select'];
      onRouteSelect?.(routeId);
    }
    if (event === 'zoom:change') {
      const { zoom } = data as EventDataMap['zoom:change'];
      onZoomChange?.(zoom);
    }
  };

  const register = (plugin: WallCanvasPlugin) => {
    plugins.set(plugin.name, plugin);
    sortPlugins();

    const ctx = getContext();
    if (ctx.canvas && plugin.init) {
      const context = ctx as CanvasContext;
      const helpers = {
        getState,
        setState,
        emit,
        getEditingPoints,
        rerender,
      };
      plugin.init(context, helpers);
    }
  };

  const unregister = (pluginName: string) => {
    const plugin = plugins.get(pluginName);
    if (plugin) {
      plugin.destroy?.();
      plugins.delete(pluginName);
      sortPlugins();
    }
  };

  const initPlugins = (canvas: Canvas) => {
    const ctx = getContext();
    const context = { ...ctx, canvas } as CanvasContext;
    const helpers = {
      getState,
      setState,
      emit,
      getEditingPoints,
      rerender,
    };

    for (const plugin of sortedPlugins) {
      plugin.init?.(context, helpers);
    }
  };

  const destroy = () => {
    for (const plugin of sortedPlugins) {
      plugin.destroy?.();
    }
    plugins.clear();
    sortedPlugins.length = 0;
  };

  return {
    register,
    unregister,
    emit,
    destroy,
    initPlugins,
  } as PluginManager;
}
