import { Line, Group, FabricObject } from 'fabric';
import type { WallCanvasPlugin, RouteWithPoints } from '../types';
import {
  LINE_WIDTH,
  LINE_OPACITY,
} from '../types';

export const RouteLineDrawingPlugin: WallCanvasPlugin = {
  name: 'RouteLineDrawingPlugin',
  priority: 110,

  on: {
    'render': (_, context) => {
      const { canvas, routes, selectedRouteId, lineGroups } = context;

      lineGroups.forEach((group) => {
        canvas.remove(group);
      });
      lineGroups.clear();

      routes.forEach((route) => {
        const isSelected = route.id === selectedRouteId;
        const group = createRouteLineGroup(route, isSelected);
        lineGroups.set(route.id, group);
        canvas.add(group);
      });

      canvas.renderAll();
    },
  },
};

function createRouteLineGroup(
  route: RouteWithPoints,
  isSelected: boolean
): Group {
  const objects: FabricObject[] = [];

  if (route.points.length > 1) {
    for (let i = 0; i < route.points.length - 1; i++) {
      const p1 = route.points[i];
      const p2 = route.points[i + 1];
      const line = new Line([p1.x, p1.y, p2.x, p2.y], {
        stroke: route.color,
        strokeWidth: isSelected ? LINE_WIDTH + 2 : LINE_WIDTH,
        opacity: isSelected ? 1 : LINE_OPACITY,
        selectable: false,
        evented: false,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      });
      objects.push(line);
    }
  }

  const group = new Group(objects, {
    selectable: false,
    evented: false,
  });

  return group;
}
