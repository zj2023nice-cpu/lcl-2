import PrintRouteCanvas from './PrintRouteCanvas';
import { PrintHeader, PrintFooter } from './PrintHeaderFooter';
import type { PrintTemplateProps } from './types';
import { formatDate } from './types';
import type { RoutePoint } from '@/components/WallCanvas/WallCanvas';
import { getGradeLabel, getGradeFullClass } from '@/lib/utils';

export default function RouteOnlyTemplate({
  route,
  wall,
  qrCodeUrl,
  gymName,
}: PrintTemplateProps) {
  const points: RoutePoint[] = (route.holds || []).map((hold) => ({
    x: hold.positionX || 0,
    y: hold.positionY || 0,
    type: hold.type === 'start' ? 'start' : hold.type === 'end' ? 'end' : 'hold',
  }));

  return (
    <div className="print-container">
      <div className="print-page">
        <PrintHeader
          title={`${route.name} · 线路图`}
          subtitle={`${route.grade} · ${getGradeLabel(route.grade)}`}
          qrCodeUrl={qrCodeUrl}
          gymName={gymName}
        />

        <div className="print-content">
          <div className="print-route-diagram">
            <PrintRouteCanvas
              points={points}
              color={route.color || '#ff6b35'}
              width={700}
              height={500}
              showLabels={true}
            />
          </div>

          <div className="print-info-grid">
            <div className="print-info-item">
              <span className="print-info-label">线路名称</span>
              <span className="print-info-value">{route.name}</span>
            </div>
            <div className="print-info-item">
              <span className="print-info-label">难度等级</span>
              <span className="print-info-value">{route.grade} · {getGradeLabel(route.grade)}</span>
            </div>
            <div className="print-info-item">
              <span className="print-info-label">岩壁</span>
              <span className="print-info-value">{wall?.name || '-'}</span>
            </div>
            <div className="print-info-item">
              <span className="print-info-label">定线员</span>
              <span className="print-info-value">{route.setterName || '未知'}</span>
            </div>
            <div className="print-info-item">
              <span className="print-info-label">开放日期</span>
              <span className="print-info-value">{formatDate(route.createdAt)}</span>
            </div>
            <div className="print-info-item">
              <span className="print-info-label">线路编号</span>
              <span className="print-info-value">#{route.id}</span>
            </div>
          </div>
        </div>

        <PrintFooter pageNumber={1} gymName={gymName} />
      </div>
    </div>
  );
}
