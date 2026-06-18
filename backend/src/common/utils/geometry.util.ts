export interface Point {
  x: number;
  y: number;
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (!polygon || polygon.length < 3) {
    return false;
  }

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

export function parsePolygonCoords(coords: any): Point[] | null {
  if (!coords) {
    return null;
  }

  if (Array.isArray(coords)) {
    const points: Point[] = [];
    for (const item of coords) {
      if (Array.isArray(item) && item.length >= 2) {
        const x = Number(item[0]);
        const y = Number(item[1]);
        if (!isNaN(x) && !isNaN(y)) {
          points.push({ x, y });
        }
      } else if (item && typeof item === 'object') {
        const x = Number(item.x);
        const y = Number(item.y);
        if (!isNaN(x) && !isNaN(y)) {
          points.push({ x, y });
        }
      }
    }
    return points.length >= 3 ? points : null;
  }

  return null;
}

export function normalizePolygonCoords(coords: any): Point[] | null {
  const polygon = parsePolygonCoords(coords);
  if (!polygon) {
    return null;
  }

  const minX = Math.min(...polygon.map((p) => p.x));
  const maxX = Math.max(...polygon.map((p) => p.x));
  const minY = Math.min(...polygon.map((p) => p.y));
  const maxY = Math.max(...polygon.map((p) => p.y));

  const width = maxX - minX;
  const height = maxY - minY;

  if (width === 0 || height === 0) {
    return null;
  }

  return polygon.map((p) => ({
    x: (p.x - minX) / width,
    y: (p.y - minY) / height,
  }));
}
