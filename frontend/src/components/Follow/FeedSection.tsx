import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Route, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Empty from '@/components/Empty';
import { followApi } from '@/utils/api';
import { useMessage } from '@/hooks/useMessage';
import { FollowButton } from '@/components/Follow';
import type { FeedGroup, FeedAscent } from '@/types';

interface FeedSectionProps {
  currentUserId?: number | null;
}

const ascentTypeLabels: Record<string, string> = {
  flash: 'Flash',
  redpoint: '红点',
  onsight: 'Onsight',
  high_point: '高点',
  fall: '失败',
};

const ascentTypeColors: Record<string, string> = {
  flash: 'bg-yellow-500/20 text-yellow-400',
  redpoint: 'bg-green-500/20 text-green-400',
  onsight: 'bg-blue-500/20 text-blue-400',
  high_point: 'bg-purple-500/20 text-purple-400',
  fall: 'bg-red-500/20 text-red-400',
};

export default function FeedSection({ currentUserId }: FeedSectionProps) {
  const [feedGroups, setFeedGroups] = useState<FeedGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const { error } = useMessage();

  const fetchFeed = useCallback(async (pageNum: number, isRefresh = false) => {
    if (!currentUserId) return;

    if (isRefresh) {
      setLoading(true);
    } else if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await followApi.getFeed({ page: pageNum, limit: 20 });
      
      if (isRefresh || pageNum === 1) {
        setFeedGroups(data.data);
      } else {
        const existingDates = new Set(feedGroups.map(g => g.date));
        const newGroups = data.data.filter(g => !existingDates.has(g.date));
        setFeedGroups(prev => [...prev, ...newGroups]);
      }
      
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (err: any) {
      error(err.message || '获取动态失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUserId, feedGroups, error]);

  useEffect(() => {
    if (currentUserId) {
      fetchFeed(1);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (page > 1) {
      fetchFeed(page, false);
    }
  }, [page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(p => p + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  const handleRefresh = () => {
    setPage(1);
    setFeedGroups([]);
    fetchFeed(1, true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toISOString().split('T')[0];
    const todayOnly = today.toISOString().split('T')[0];
    const yesterdayOnly = yesterday.toISOString().split('T')[0];

    if (dateOnly === todayOnly) return '今天';
    if (dateOnly === yesterdayOnly) return '昨天';

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!currentUserId) {
    return null;
  }

  return (
    <Card>
      <div className="p-5 border-b border-theme-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-theme-text">关注动态</h2>
          <p className="text-sm text-theme-text-muted mt-1">
            {total > 0 ? `共 ${total} 条记录` : '查看你关注的人的攀爬记录'}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-climbing-orange-500" />
          </div>
        ) : feedGroups.length === 0 ? (
          <Empty
            title="暂无动态"
            description="关注其他攀岩者来查看他们的攀爬记录"
            icon={<Route size={48} className="text-theme-text-muted" />}
          />
        ) : (
          <div className="space-y-6">
            {feedGroups.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-theme-bg py-2 z-10">
                  <div className="h-px flex-1 bg-theme-border" />
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-theme-card border border-theme-border">
                    <Calendar size={14} className="text-climbing-orange-500" />
                    <span className="text-sm font-medium text-theme-text">
                      {formatDate(group.date)}
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-theme-border" />
                </div>

                <div className="space-y-3">
                  {group.ascents.map((ascent) => (
                    <AscentCard key={ascent.id} ascent={ascent} currentUserId={currentUserId} />
                  ))}
                </div>
              </div>
            ))}

            <div ref={observerRef} className="py-4 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-theme-text-muted">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">加载更多...</span>
                </div>
              )}
              {!hasMore && feedGroups.length > 0 && (
                <div className="text-sm text-theme-text-muted">
                  没有更多了
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function AscentCard({ ascent, currentUserId }: { ascent: FeedAscent; currentUserId?: number | null }) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 rounded-lg bg-theme-card hover:bg-theme-hover transition-colors border border-theme-border hover:border-theme-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Link to={`/users/${ascent.userId}`} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-climbing-orange-500/20 flex items-center justify-center text-climbing-orange-500 font-semibold hover:opacity-80 transition-opacity">
              {ascent.userName.charAt(0).toUpperCase()}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link to={`/users/${ascent.userId}`} className="font-medium text-theme-text hover:text-climbing-orange-500 transition-colors">
                {ascent.userName}
              </Link>
              <span className="text-xs text-theme-text-muted">
                {formatTime(ascent.createdAt)}
              </span>
            </div>
            <Link
              to={`/routes/${ascent.routeId}`}
              className="group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ascent.routeColor || '#888' }}
                />
                <span className="font-semibold text-theme-text group-hover:text-climbing-orange-500 transition-colors">
                  {ascent.routeName}
                </span>
                <span className="px-2 py-0.5 bg-theme-border rounded text-xs font-bold text-climbing-orange-400">
                  {ascent.routeGrade}
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${ascentTypeColors[ascent.ascentType] || 'bg-gray-500/20 text-gray-400'}`}>
                {ascentTypeLabels[ascent.ascentType] || ascent.ascentType}
              </span>
              <span className="text-xs text-theme-text-muted">
                {ascent.attempts} 次尝试
              </span>
            </div>
            {ascent.notes && (
              <p className="mt-2 text-sm text-theme-text-muted line-clamp-2">
                {ascent.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <FollowButton
            targetUserId={ascent.userId}
            currentUserId={currentUserId}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
