import { useMemo } from 'react';
import PrintRouteCanvas from './PrintRouteCanvas';
import { PrintHeader, PrintFooter } from './PrintHeaderFooter';
import type { PrintTemplateProps } from './types';
import { formatDate } from './types';
import type { RoutePoint } from '@/components/WallCanvas/WallCanvas';
import { getGradeLabel, getGradeFullClass } from '@/lib/utils';
import { Tag, User, Calendar, Award, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

const routeTypeLabels: Record<string, string> = {
  boulder: '抱石',
  lead: '先锋',
  top_rope: '顶绳',
  speed: '速度',
};

const ascentTypeLabels: Record<string, string> = {
  flash: 'Flash',
  onsight: 'Onsight',
  redpoint: '红点',
  high_point: '高点',
  fall: '脱落',
};

const tagOptions = [
  { value: 'crimp', label: 'Crimp' },
  { value: 'sloper', label: 'Sloper' },
  { value: 'dyno', label: 'Dyno' },
  { value: 'crack', label: 'Crack' },
  { value: 'endurance', label: '耐力' },
  { value: 'technical', label: '技术型' },
  { value: 'powerful', label: '力量型' },
  { value: 'balance', label: '平衡' },
];

export default function FullReportTemplate({
  route,
  wall,
  ascents = [],
  votes = [],
  qrCodeUrl,
  gymName,
}: PrintTemplateProps) {
  const points: RoutePoint[] = (route.holds || []).map((hold) => ({
    x: hold.positionX || 0,
    y: hold.positionY || 0,
    type: hold.type === 'start' ? 'start' : hold.type === 'end' ? 'end' : 'hold',
  }));

  const completionStats = useMemo(() => {
    const completed = ascents.filter(
      (a) => a.ascentType === 'flash' || a.ascentType === 'onsight' || a.ascentType === 'redpoint'
    ).length;
    const total = ascents.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, rate };
  }, [ascents]);

  const consensusGrade = useMemo(() => {
    if (votes.length === 0) return 'N/A';
    const gradeCounts: Record<string, number> = {};
    votes.forEach((v) => {
      gradeCounts[v.suggestedGrade] = (gradeCounts[v.suggestedGrade] || 0) + 1;
    });
    const sorted = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }, [votes]);

  const displayedAscents = ascents.slice(0, 8);

  return (
    <div className="print-container">
      <div className="print-page">
        <PrintHeader
          title={`${route.name} · 完整报告`}
          subtitle={`${route.grade} · ${getGradeLabel(route.grade)} · ${routeTypeLabels[route.type]}`}
          qrCodeUrl={qrCodeUrl}
          gymName={gymName}
        />

        <div className="print-content">
          <div className="print-section">
            <div className="print-route-diagram">
              <PrintRouteCanvas
                points={points}
                color={route.color || '#ff6b35'}
                width={650}
                height={420}
                showLabels={true}
              />
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">基本信息</div>
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
                <span className="print-info-label">线路类型</span>
                <span className="print-info-value">{routeTypeLabels[route.type]}</span>
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
            </div>
          </div>

          {route.tags && route.tags.length > 0 && (
            <div className="print-section">
              <div className="print-section-title">标签</div>
              <div className="print-tags">
                {route.tags.map((tagValue) => {
                  const tag = tagOptions.find((t) => t.value === tagValue);
                  return tag ? (
                    <span key={tagValue} className="print-tag">{tag.label}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="print-section">
            <div className="print-section-title">数据统计</div>
            <div className="print-stats-grid">
              <div className="print-stat-card">
                <div className="print-stat-value">{completionStats.total}</div>
                <div className="print-stat-label">总攀爬次数</div>
              </div>
              <div className="print-stat-card">
                <div className="print-stat-value">{completionStats.rate}%</div>
                <div className="print-stat-label">完攀率</div>
              </div>
              <div className="print-stat-card">
                <div className="print-stat-value">{votes.length}</div>
                <div className="print-stat-label">难度投票</div>
              </div>
            </div>
          </div>
        </div>

        <PrintFooter pageNumber={1} totalPages={2} gymName={gymName} />
      </div>

      <div className="print-page">
        <PrintHeader
          title={`${route.name} · 攀爬记录`}
          subtitle={`共 ${ascents.length} 条记录`}
          qrCodeUrl={qrCodeUrl}
          gymName={gymName}
        />

        <div className="print-content">
          <div className="print-section">
            <div className="print-section-title">难度共识</div>
            <div className="print-info-grid">
              <div className="print-info-item">
              <span className="print-info-label">定线定级</span>
              <span className="print-info-value">{route.grade} · {getGradeLabel(route.grade)}</span>
            </div>
            <div className="print-info-item">
              <span className="print-info-label">社区共识</span>
              <span className="print-info-value">
                {consensusGrade !== 'N/A' 
                  ? `${consensusGrade} · ${getGradeLabel(consensusGrade)}`
                  : '暂无'
                }
              </span>
            </div>
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">最近攀爬记录</div>
            {displayedAscents.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '10pt' }}>
              暂无攀爬记录
            </p>
            ) : (
              <div className="print-ascent-list">
                {displayedAscents.map((ascent) => (
                  <div key={ascent.id} className="print-ascent-item">
                    <div className="print-ascent-user">
                      <div className="print-ascent-avatar">
                        {(ascent.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="print-ascent-info">
                        <span className="print-ascent-name">
                          {ascent.userName || `用户${ascent.userId}`}
                        </span>
                        <span className="print-ascent-date">
                          {new Date(ascent.createdAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                          · 尝试 {ascent.attempts} 次
                        </span>
                      </div>
                    </div>
                    <span className={`print-ascent-type print-ascent-type-${ascent.ascentType}`}>
                      {ascentTypeLabels[ascent.ascentType]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {route.description && (
            <div className="print-section">
              <div className="print-section-title">线路描述</div>
              <p style={{ fontSize: '10pt', color: '#4b5563', lineHeight: '1.6' }}>
                {route.description}
              </p>
            </div>
          )}
        </div>

        <PrintFooter pageNumber={2} totalPages={2} gymName={gymName} />
      </div>
    </div>
  );
}
