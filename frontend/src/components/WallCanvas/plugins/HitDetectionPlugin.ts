import type { WallCanvasPlugin, FabricObjectWithData } from '../types';

export const HitDetectionPlugin: WallCanvasPlugin = {
  name: 'HitDetectionPlugin',
  priority: 95,

  on: {
    'canvas:click': (data, context, helpers) => {
      const { target } = data;
      const state = helpers.getState();
      const { activeTool } = state;

      if (activeTool !== 'select') return;

      const { routeIdMap } = context;

      if (target) {
        const targetData = (target as FabricObjectWithData).data;
        if (targetData?.routeId) {
          helpers.emit('route:select', { routeId: targetData.routeId as number });
          return false;
        }

        const group = (target as any).group;
        if (group) {
          const routeId = routeIdMap.get(group);
          if (routeId) {
            helpers.emit('route:select', { routeId });
            return false;
          }
        }
      }

      helpers.emit('route:select', { routeId: null });
      return false;
    },
  },
};
