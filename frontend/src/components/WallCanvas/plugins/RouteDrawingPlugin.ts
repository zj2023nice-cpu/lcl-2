import { Line } from 'fabric';
import type { WallCanvasPlugin, CanvasContext, RoutePoint } from '../types';
import { LINE_WIDTH, LINE_OPACITY } from '../types';

export const RouteDrawingPlugin: WallCanvasPlugin = {
  name: 'RouteDrawingPlugin',
  priority: 90,

  on: {
    'canvas:click': (data, context, helpers) => {
      const { pointer } = data;
      const state = helpers.getState();
      const { activeTool, selectedRouteId, editingRouteId } = state;

      if (activeTool === 'select') return;

      if (!editingRouteId && selectedRouteId) {
        helpers.setState({ editingRouteId: selectedRouteId });
      }

      const effectiveEditingRouteId = state.editingRouteId || selectedRouteId;
      if (!effectiveEditingRouteId) return;

      const currentPoints = helpers.getEditingPoints();
      const newPoint: RoutePoint = {
        x: pointer.x,
        y: pointer.y,
        type: activeTool === 'start' ? 'start' : activeTool === 'end' ? 'end' : 'hold',
      };

      let newPoints: RoutePoint[];
      if (activeTool === 'start') {
        const hasStart = currentPoints.some((p) => p.type === 'start');
        if (hasStart) {
          newPoints = currentPoints.map((p) => (p.type === 'start' ? newPoint : p));
        } else {
          newPoints = [newPoint, ...currentPoints.filter((p) => p.type !== 'start')];
        }
      } else if (activeTool === 'end') {
        const hasEnd = currentPoints.some((p) => p.type === 'end');
        if (hasEnd) {
          newPoints = currentPoints.map((p) => (p.type === 'end' ? newPoint : p));
        } else {
          newPoints = [...currentPoints.filter((p) => p.type !== 'end'), newPoint];
        }
      } else {
        newPoints = [...currentPoints, newPoint];
      }

      helpers.emit('history:push', { points: currentPoints });
      helpers.emit('route:update', { routeId: effectiveEditingRouteId, points: newPoints });

      return false;
    },

    'point:delete': (data, context, helpers) => {
      const { routeId, pointIndex } = data;
      const currentPoints = helpers.getEditingPoints();

      if (pointIndex >= 0 && pointIndex < currentPoints.length) {
        helpers.emit('history:push', { points: currentPoints });
        const newPoints = currentPoints.filter((_, i) => i !== pointIndex);
        helpers.emit('route:update', { routeId, points: newPoints });
        helpers.setState({ selectedPointIndex: null });
      }
    },
  },
};
