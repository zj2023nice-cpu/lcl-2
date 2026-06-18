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
    let deletedCount = 0;
    let isMainDeleted = false;

    const processRecursive = (list: Comment[]): Comment[] => {
      return list
        .filter((c) => {
          if (c.id === id) {
            if (c.parentId === null || c.parentId === undefined) {
              isMainDeleted = true;
              deletedCount = 1 + (c.totalReplyCount ?? c.replyCount ?? 0);
              return true;
            } else {
              deletedCount = 1;
              return false;
            }
          }
          return true;
        })
        .map((c) => {
          if (c.id === id && isMainDeleted) {
            return {
              ...c,
              status: 'deleted',
              content: '[该评论已被删除]',
              replies: [],
              replyCount: 0,
              totalReplyCount: 0,
            };
          }
          if (c.replies && c.replies.length > 0) {
            const newReplies = processRecursive(c.replies);
            const replyRemoved = c.replies.length - newReplies.length;
            if (replyRemoved > 0) {
              return {
                ...c,
                replies: newReplies,
                replyCount: Math.max(0, (c.replyCount ?? 0) - replyRemoved),
                totalReplyCount: Math.max(
                  0,
                  (c.totalReplyCount ?? c.replyCount ?? 0) - replyRemoved,
                ),
              };
            }
            return { ...c, replies: newReplies };
          }
          return c;
        });
    };

    setComments((prev) => processRecursive(prev));
    if (deletedCount > 0) {
      setTotalComments((t) => Math.max(0, t - deletedCount));
      if (isMainDeleted) {
        setTotalParents((t) => Math.max(0, t - 1));
      }
    }
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

  const addReplies = useCallback(
    (parentId: number, replies: Comment[]) => {
      if (replies.length === 0) return;
      setComments((prev) => {
        const addToParent = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            if (c.id === parentId) {
              const currentReplies = c.replies || [];
              const existingIds = new Set(currentReplies.map((r) => r.id));
              const newReplies = replies.filter((r) => !existingIds.has(r.id));
              return {
                ...c,
                replies: [...currentReplies, ...newReplies],
                replyCount: currentReplies.length + newReplies.length,
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
      <div className="p-5 border-b border-theme-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-climbing-orange-400" />
              <h3 className="font-semibold text-theme-text">评论区</h3>
              <span className="text-xs text-theme-text-muted px-2 py-0.5 bg-theme-hover rounded-full">
                {totalComments}
              </span>
            </div>
            <p className="text-xs text-theme-text-muted mt-1">
              {totalParents > 0
                ? `共 ${totalParents} 条主评论，${totalComments} 条包含回复`
                : '暂无评论，快来抢沙发吧'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-theme-hover text-theme-text-secondary hover:text-theme-text transition-all disabled:opacity-50"
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
          <div className="mb-6 p-4 bg-theme-subtle rounded-xl border border-theme-border flex items-center gap-3">
            <Lock size={18} className="text-theme-text-muted flex-shrink-0" />
            <div>
              <p className="text-sm text-theme-text-secondary">
                {user
                  ? '请完成身份认证后发表评论'
                  : '请登录后发表评论'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-0 divide-y divide-theme-border/50">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-theme-hover animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <div className="h-4 w-24 bg-theme-hover rounded animate-pulse" />
                      <div className="h-3 w-12 bg-theme-hover rounded animate-pulse" />
                    </div>
                    <div className="h-16 bg-theme-hover rounded-lg animate-pulse" />
                    <div className="flex gap-3">
                      <div className="h-4 w-12 bg-theme-hover rounded animate-pulse" />
                      <div className="h-4 w-12 bg-theme-hover rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare
                size={48}
                className="mx-auto text-theme-text-muted mb-4 opacity-50"
              />
              <p className="text-theme-text-muted">还没有评论</p>
              <p className="text-xs text-theme-text-muted mt-1">
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
                  onAddReplies={addReplies}
                  onDelete={deleteComment}
                />
              ))}
            </>
          )}
        </div>

        {!isLoading && hasMore && (
          <div className="mt-4 pt-4 border-t border-theme-border">
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
