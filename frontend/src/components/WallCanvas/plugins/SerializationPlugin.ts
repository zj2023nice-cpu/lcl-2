import type { WallCanvasPlugin, RoutePoint } from '../types';
import type { Hold, HoldType } from '@/types';

export const SerializationPlugin: WallCanvasPlugin = {
  name: 'SerializationPlugin',
  priority: 60,

  on: {
    'route:update': (data, context, helpers) => {
      const { routeId, points } = data;
      const holds = serializePointsToHolds(routeId, points);
      console.debug('[SerializationPlugin] Route updated:', { routeId, points, holds });
    },
  },
};

export function serializePointsToHolds(routeId: number, points: RoutePoint[]): Hold[] {
  return points.map((point, index) => ({
    id: Date.now() + index,
    routeId,
    type: mapPointTypeToHoldType(point.type),
    positionX: Math.round(point.x),
    positionY: Math.round(point.y),
  }));
}

export function deserializeHoldsToPoints(holds: Hold[]): RoutePoint[] {
  return holds.map((hold) => ({
    x: hold.positionX,
    y: hold.positionY,
    type: mapHoldTypeToPointType(hold.type),
  }));
}

function mapPointTypeToHoldType(type: RoutePoint['type']): HoldType {
  switch (type) {
    case 'start':
      return 'start';
    case 'end':
      return 'end';
    case 'hold':
    default:
      return 'hand';
  }
}

function mapHoldTypeToPointType(type: HoldType): RoutePoint['type'] {
  switch (type) {
    case 'start':
      return 'start';
    case 'end':
      return 'end';
    case 'hand':
    case 'foot':
    default:
      return 'hold';
  }
}
