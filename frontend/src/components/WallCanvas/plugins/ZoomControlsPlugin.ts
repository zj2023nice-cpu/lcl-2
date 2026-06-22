import type { WallCanvasPlugin } from '../types';

export const ZoomControlsPlugin: WallCanvasPlugin = {
  name: 'ZoomControlsPlugin',
  priority: 65,

  on: {
    'zoom:change': (data, context, helpers) => {
      const { zoom } = data;
      const { canvas } = context;
      canvas.setZoom(zoom);
    },
  },
};

export function handleZoomIn(currentZoom: number): number {
  return Math.min(currentZoom * 1.2, 3);
}

export function handleZoomOut(currentZoom: number): number {
  return Math.max(currentZoom / 1.2, 0.3);
}

export function handleZoomReset(): number {
  return 1;
}
