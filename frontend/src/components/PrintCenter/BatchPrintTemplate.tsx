import { useMemo } from 'react';
import PrintRouteCanvas from './PrintRouteCanvas';
import { PrintHeader, PrintFooter } from './PrintHeaderFooter';
import type { BatchPrintTemplateProps } from './types';
import { getGradeLabel } from '@/lib/utils';
import type { RoutePoint } from '@/components/WallCanvas/WallCanvas';
import type { Route } from '@/types';

interface RouteCardProps {
  route: Route;
  index: number;
}

function RouteCard({ route, index }: RouteCardProps) {
  const points: RoutePoint[] = (route.holds || []).map((hold) => ({
    x: hold.positionX || 0,
    y: hold.positionY || 0,
    type: hold.type === 'start' ? 'start' : hold.type === 'end' ? 'end' : 'hold',
  }));

  return (
    <div className="print-batch-card">
      <div className="print-batch-header">
        <span className="print-batch-name">#{index + 1}. {route.name}</span>
        <span
          style={{
            padding: '2mm 4mm',
            borderRadius: '4mm',
            fontSize: '9pt',
            fontWeight: 600,
            background: route.color || '#ff6b35',
            color: 'white',
          }}
        >
          {route.grade}
        </span>
      </div>

      <div className="print-batch-route-canvas">
        <PrintRouteCanvas
          points={points}
          color={route.color || '#ff6b35'}
          width={280}
          height={180}
          showLabels={false}
        />
      </div>

      <div className="print-batch-info">
        <span style={{ color: '#6b7280' }}>{getGradeLabel(route.grade)}</span>
        <span style={{ color: '#6b7280' }}>{route.setterName || '未知定线员'}</span>
      </div>
    </div>
  );
}

export default function BatchPrintTemplate({
  routes,
  wall,
  qrCodeUrl,
  gymName,
}: BatchPrintTemplateProps) {
  const pages = useMemo(() => {
    const result: Route[][] = [];
    const routesPerPage = 6;

    for (let i = 0; i < routes.length; i += routesPerPage) {
      result.push(routes.slice(i, i + routesPerPage));
    }
    return result;
  }, [routes]);

  return (
    <div className="print-container">
      {pages.map((pageRoutes, pageIndex) => (
        <div key={pageIndex} className="print-page">
          <PrintHeader
            title={`线路批量打印 · 第 ${pageIndex + 1} 组`}
            subtitle={`共 ${routes.length} 条线路`}
            qrCodeUrl={qrCodeUrl}
            gymName={gymName}
          />

          <div className="print-content">
            <div className="print-batch-grid">
              {pageRoutes.map((route, idx) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  index={pageIndex * 6 + idx}
                />
              ))}
            </div>
          </div>

          <PrintFooter
            pageNumber={pageIndex + 1}
            totalPages={pages.length}
            gymName={gymName}
          />
        </div>
      ))}
    </div>
  );
}
