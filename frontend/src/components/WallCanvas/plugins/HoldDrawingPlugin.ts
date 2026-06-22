import { Circle, Line, Group, FabricObject } from 'fabric';
import type { WallCanvasPlugin, FabricObjectWithData, RouteWithPoints } from '../types';
import {
  HOLD_RADIUS,
  START_COLOR,
  END_COLOR,
  HOLD_STROKE_COLOR,
  HOLD_STROKE_WIDTH,
  LINE_WIDTH,
  LINE_OPACITY,
} from '../types';

export const HoldDrawingPlugin: WallCanvasPlugin = {
  name: 'HoldDrawingPlugin',
  priority: 100,

  on: {
    'render': (_, context) => {
      const { canvas, routes, selectedRouteId, isEditable, routeGroups, routeIdMap } = context;

      routeGroups.forEach((group) => {
        canvas.remove(group);
      });
      routeGroups.clear();
      routeIdMap.clear();

      routes.forEach((route) => {
        const isSelected = route.id === selectedRouteId;
        const group = createRouteGroupWithHolds(route, isSelected, isEditable);
        routeGroups.set(route.id, group);
        routeIdMap.set(group, route.id);
        canvas.add(group);
      });

      canvas.renderAll();
    },
  },
};

function createRouteGroupWithHolds(
  route: RouteWithPoints,
  isSelected: boolean,
  isEditable: boolean
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

  route.points.forEach((point, index) => {
    let color = route.color;
    if (point.type === 'start') color = START_COLOR;
    else if (point.type === 'end') color = END_COLOR;

    const circle = new Circle({
      left: point.x - HOLD_RADIUS,
      top: point.y - HOLD_RADIUS,
      radius: HOLD_RADIUS,
      fill: color,
      stroke: isSelected ? '#fff' : HOLD_STROKE_COLOR,
      strokeWidth: isSelected ? HOLD_STROKE_WIDTH + 1 : HOLD_STROKE_WIDTH,
      selectable: isEditable,
      hasControls: false,
      hasBorders: false,
    }) as FabricObjectWithData;

    circle.data = {
      routeId: route.id,
      pointIndex: index,
      pointType: point.type,
    };

    if (isSelected) {
      const outerCircle = new Circle({
        left: point.x - HOLD_RADIUS - 4,
        top: point.y - HOLD_RADIUS - 4,
        radius: HOLD_RADIUS + 4,
        fill: 'transparent',
        stroke: '#FF6B35',
        strokeWidth: 2,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
      });
      objects.push(outerCircle);
    }

    objects.push(circle);
  });

  const group = new Group(objects, {
    selectable: false,
    evented: true,
  });

  return group;
}
