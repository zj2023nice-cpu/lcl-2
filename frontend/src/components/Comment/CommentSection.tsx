import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Loader2,
  Lock,
  ChevronDown,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';
import type { Comment, PaginatedComments } from '@/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useMessage } from '@/hooks/useMessage';
import { commentApi } from '@/utils/api';

interface CommentSectionProps {
  routeId: number;
}

const REFRESH_INTERVAL = 30000;
const PAGE_SIZE = 10;

export default function CommentSection({ routeId }: CommentSectionProps) {
  const { user } = useAuthStore();
  const { success, error, warning } = useMessage();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [totalParents, setTotalParents] = useState(0);

  const refreshTimerRef = useRef<number | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());

  const canComment =
    !!user &&
    ['verified_climber', 'setter', 'gym_admin', 'platform_admin'].includes(user.role);

  const fetchComments = useCallback(
    async (
      targetPage: number,
      isRefresh: boolean = false,
      showLoading: boolean = true,
    ) => {
      if (showLoading) setIsLoading(true);
      if (isRefresh) setIsRefreshing(true);
      try {
        const result: PaginatedComments = await commentApi.getComments(routeId, {
          page: targetPage,
          limit: PAGE_SIZE,
          replyLimit: 3,
        });

        if (isRefresh || targetPage === 1) {
          setComments(result.data);
        } else {
          setComments((prev) => [...prev, ...result.data]);
        }
        setPage(targetPage);
        setHasMore(result.hasMore);
        setTotalComments(result.totalComments);
        setTotalParents(result.total);
        lastRefreshRef.current = Date.now();
      } catch (e) {
        if (showLoading) {
          error('加载评论失败');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [routeId, error],
  );

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  useEffect(() => {
    if (!user) return;
    refreshTimerRef.current = window.setInterval(() => {
      fetchComments(1, true, false);
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [user, fetchComments]);

  const updateComment = useCallback((id: number, updater: (c: Comment) => Comment) => {
    const updateRecursive = (list: Comment[]): Comment[] => {
      return list.map((c) => {
        if (c.id === id) {
          return updater(c);
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateRecursive(c.replies) };
        }
        return c;
      });
    };
    setComments((prev) => updateRecursive(prev));
  }, []);

  const deleteComment = useCallback((id: number) => {
    const filterRecursive = (list: Comment[]): Comment[] => {
      return list
        .filter((c) => c.id !== id)
        .map((c) => {
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: filterRecursive(c.replies),
            };
          }
          return c;
        });
    };
    setComments((prev) => filterRecursive(prev));
    setTotalParents((t) => Math.max(0, t - 1));
    setTotalComments((t) => Math.max(0, t - 1));
  }, []);

  const addReply = useCallback(
    (parentId: number, reply: Comment) => {
      setComments((prev) => {
        const addToParent = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            if (c.id === parentId) {
              const currentReplies = c.replies || [];
              return {
                ...c,
                replies: [...currentReplies, reply],
                totalReplyCount: (c.totalReplyCount ?? c.replyCount ?? 0) + 1,
                replyCount: (c.replyCount ?? 0) + 1,
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: addToParent(c.replies) };
            }
            return c;
          });
        };
        return addToParent(prev);
      });
      setTotalComments((t) => t + 1);
    },
    [],
  );

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await fetchComments(page + 1, false, false);
  };

  const handleCreateComment = async (content: string) => {
    if (!canComment) {
      warning('需要认证用户才能发表评论');
      throw new Error('No permission');
    }
    const newComment = await commentApi.createComment(routeId, { content });
    setComments((prev) => [newComment, ...prev]);
    setTotalParents((t) => t + 1);
    setTotalComments((t) => t + 1);
    success('评论发布成功');
  };

  const handleRefresh = () => {
    fetchComments(1, true);
  };

  return (
    <Card>
      <div className="p-5 border-b border-rock-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-climbing-orange-400" />
              <h3 className="font-semibold text-white">评论区</h3>
              <span className="text-xs text-rock-light-500 px-2 py-0.5 bg-rock-dark-700 rounded-full">
                {totalComments}
              </span>
            </div>
            <p className="text-xs text-rock-light-500 mt-1">
              {totalParents > 0
                ? `共 ${totalParents} 条主评论，${totalComments} 条包含回复`
                : '暂无评论，快来抢沙发吧'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-rock-dark-700 text-rock-light-400 hover:text-white transition-all disabled:opacity-50"
            title="刷新评论"
          >
            <RefreshCw
              size={16}
              className={cn(isRefreshing && 'animate-spin')}
            />
          </button>
        </div>
      </div>

      <div className="p-5">
        {canComment ? (
          <div className="mb-6">
            <CommentInput
              onSubmit={handleCreateComment}
              placeholder="分享你对这条线路的看法、爬线心得或建议..."
              minHeight={90}
            />
          </div>
        ) : (
          <div className="mb-6 p-4 bg-rock-dark-900 rounded-xl border border-rock-dark-700 flex items-center gap-3">
            <Lock size={18} className="text-rock-light-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-rock-light-400">
                {user
                  ? '请完成身份认证后发表评论'
                  : '请登录后发表评论'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-0 divide-y divide-rock-dark-700/50">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-rock-dark-700 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <div className="h-4 w-24 bg-rock-dark-700 rounded animate-pulse" />
                      <div className="h-3 w-12 bg-rock-dark-700 rounded animate-pulse" />
                    </div>
                    <div className="h-16 bg-rock-dark-700 rounded-lg animate-pulse" />
                    <div className="flex gap-3">
                      <div className="h-4 w-12 bg-rock-dark-700 rounded animate-pulse" />
                      <div className="h-4 w-12 bg-rock-dark-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare
                size={48}
                className="mx-auto text-rock-light-600 mb-4 opacity-50"
              />
              <p className="text-rock-light-500">还没有评论</p>
              <p className="text-xs text-rock-light-600 mt-1">
                {canComment ? '成为第一个发表评论的人吧' : '登录后即可发表评论'}
              </p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onUpdate={updateComment}
                  onAddReply={addReply}
                  onDelete={deleteComment}
                />
              ))}
            </>
          )}
        </div>

        {!isLoading && hasMore && (
          <div className="mt-4 pt-4 border-t border-rock-dark-700">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              isLoading={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <ChevronDown size={16} className="mr-2" />
                  加载更多评论
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
