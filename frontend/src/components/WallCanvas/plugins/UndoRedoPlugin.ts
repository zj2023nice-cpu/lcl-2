import type { WallCanvasPlugin, RoutePoint } from '../types';

export const UndoRedoPlugin: WallCanvasPlugin = {
  name: 'UndoRedoPlugin',
  priority: 80,

  on: {
    'history:push': (data, context, helpers) => {
      const { points } = data;
      const state = helpers.getState();
      helpers.setState({
        history: [...state.history, points],
      });
    },

    'history:undo': (_, context, helpers) => {
      const state = helpers.getState();
      const { history, editingRouteId, selectedRouteId } = state;

      if (history.length === 0) return false;

      const previousPoints = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      const routeId = editingRouteId || selectedRouteId || 0;

      helpers.setState({ history: newHistory });
      helpers.emit('route:update', { routeId, points: previousPoints });

      return false;
    },
  },
};
