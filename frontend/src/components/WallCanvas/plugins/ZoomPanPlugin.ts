import { Point } from 'fabric';
import type { WallCanvasPlugin } from '../types';

let isDragging = false;
let lastPosX = 0;
let lastPosY = 0;

export const ZoomPanPlugin: WallCanvasPlugin = {
  name: 'ZoomPanPlugin',
  priority: 70,

  on: {
    'canvas:mouse:down': (data, context) => {
      const { e } = data;
      const { canvas } = context;

      if (e.button === 1 || (e.button === 0 && (e as any).shiftKey)) {
        isDragging = true;
        lastPosX = e.clientX;
        lastPosY = e.clientY;
        canvas.discardActiveObject();
        canvas.renderAll();
        return false;
      }
    },

    'canvas:mouse:move': (data, context) => {
      if (!isDragging) return;

      const { e } = data;
      const { canvas } = context;

      const deltaX = e.clientX - lastPosX;
      const deltaY = e.clientY - lastPosY;
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] += deltaX;
        vpt[5] += deltaY;
      }
      lastPosX = e.clientX;
      lastPosY = e.clientY;
      canvas.requestRenderAll();
      return false;
    },

    'canvas:mouse:up': () => {
      isDragging = false;
    },

    'canvas:mouse:wheel': (data, context, helpers) => {
      const { e, pointer, delta } = data;
      const { canvas } = context;

      e.preventDefault();
      e.stopPropagation();

      let currentZoom = canvas.getZoom();
      currentZoom *= 0.999 ** delta;
      currentZoom = Math.max(0.3, Math.min(3, currentZoom));

      canvas.zoomToPoint(new Point(pointer.x, pointer.y), currentZoom);
      helpers.setState({ zoom: currentZoom });
      helpers.emit('zoom:change', { zoom: currentZoom });

      return false;
    },
  },

  destroy: () => {
    isDragging = false;
  },
};
