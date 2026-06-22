import { Point } from 'fabric';
import type { Canvas } from 'fabric';
import type { WallCanvasPlugin } from '../types';

interface DragState {
  isDragging: boolean;
  lastPosX: number;
  lastPosY: number;
}

const dragStateMap = new WeakMap<Canvas, DragState>();

function getDragState(canvas: Canvas): DragState {
  let state = dragStateMap.get(canvas);
  if (!state) {
    state = { isDragging: false, lastPosX: 0, lastPosY: 0 };
    dragStateMap.set(canvas, state);
  }
  return state;
}

export const ZoomPanPlugin: WallCanvasPlugin = {
  name: 'ZoomPanPlugin',
  priority: 70,

  init: (context) => {
    dragStateMap.set(context.canvas, { isDragging: false, lastPosX: 0, lastPosY: 0 });
  },

  on: {
    'canvas:mouse:down': (data, context) => {
      const { e } = data;
      const { canvas } = context;
      const state = getDragState(canvas);

      if (e.button === 1 || (e.button === 0 && (e as any).shiftKey)) {
        state.isDragging = true;
        state.lastPosX = e.clientX;
        state.lastPosY = e.clientY;
        canvas.discardActiveObject();
        canvas.renderAll();
        return false;
      }
    },

    'canvas:mouse:move': (data, context) => {
      const { e } = data;
      const { canvas } = context;
      const state = getDragState(canvas);

      if (!state.isDragging) return;

      const deltaX = e.clientX - state.lastPosX;
      const deltaY = e.clientY - state.lastPosY;
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] += deltaX;
        vpt[5] += deltaY;
      }
      state.lastPosX = e.clientX;
      state.lastPosY = e.clientY;
      canvas.requestRenderAll();
      return false;
    },

    'canvas:mouse:up': (_, context) => {
      const state = getDragState(context.canvas);
      state.isDragging = false;
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
  },
};
