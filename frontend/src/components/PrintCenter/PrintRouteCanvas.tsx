import { useEffect, useRef } from 'react';
import type { RoutePoint } from '@/components/WallCanvas/WallCanvas';

interface PrintRouteCanvasProps {
  points: RoutePoint[];
  color: string;
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export default function PrintRouteCanvas({
  points,
  color,
  width = 600,
  height = 450,
  showLabels = false,
}: PrintRouteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (points.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    points.forEach((point) => {
      let pointColor = color;
      if (point.type === 'start') pointColor = '#22c55e';
      else if (point.type === 'end') pointColor = '#ef4444';

      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = pointColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (showLabels && point.type !== 'hold') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(point.type === 'start' ? '起' : '终', point.x, point.y);
      }
    });
  }, [points, color, width, height, showLabels]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    />
  );
}
