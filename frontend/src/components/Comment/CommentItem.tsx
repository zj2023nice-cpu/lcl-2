import { useState, useCallback } from 'react';
import {
  User,
  ThumbsUp,
  MessageSquare,
  Flag,
  Trash2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import type { Comment } from '@/types';
import CommentInput from './CommentInput';
import ReportModal from './ReportModal';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useMessage } from '@/hooks/useMessage';
import { commentApi } from '@/utils/api';

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onUpdate: (id: number, updater: (c: Comment) => Comment) => void;
  onAddReply?: (parentId: number, reply: Comment) => void;
  onAddReplies?: (parentId: number, replies: Comment[]) => void;
  onDelete?: (id: number) => void;
  level?: number;
}

export default function CommentItem({
  comment,
  isReply = false,
  onUpdate,
  onAddReply,
  onAddReplies,
  onDelete,
  level = 0,
}: CommentItemProps) {
  const { user } = useAuthStore();
  const { success, error, warning } = useMessage();

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [localReplies, setLocalReplies] = useState<Comment[]>(comment.replies || []);
  const [replyPage, setReplyPage] = useState(2);

  const isOwner = user?.id === comment.userId;
  const isAdmin = user?.role === 'platform_admin' || user?.role === 'gym_admin';
  const canDelete = isOwner || isAdmin;
  const canInteract = !!user;
  const isDeleted = comment.status === 'deleted';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    if (hrs < 24) return `${hrs}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const handleLike = useCallback(async () => {
    if (!canInteract) {
      warning('请先登录');
      return;
    }
    setIsLiking(true);
    try {
      const result = await commentApi.toggleLike(comment.id);
      onUpdate(comment.id, (c) => ({
        ...c,
        likeCount: result.likeCount,
        likedByCurrentUser: result.liked,
      }));
    } catch (e) {
      error('点赞失败');
    } finally {
      setIsLiking(false);
    }
  }, [canInteract, comment.id, onUpdate, warning, error]);

  const handleDelete = useCallback(async () => {
    if (!canDelete || isDeleted) return;
    if (!window.confirm('确定要删除这条评论吗？')) return;
    setIsDeleting(true);
    try {
      await commentApi.deleteComment(comment.id);
      if (onDelete) {
        onDelete(comment.id);
      }
      success('删除成功');
    } catch (e) {
      error('删除失败');
    } finally {
      setIsDeleting(false);
    }
  }, [canDelete, isDeleted, comment.id, onDelete, success, error]);

  const handleReport = useCallback(
    async (reason: any, description?: string) => {
      try {
        await commentApi.reportComment(comment.id, reason, description);
        success('举报已提交，感谢您的反馈');
      } catch (e) {
        error('举报失败');
      }
    },
    [comment.id, success, error],
  );

  const handleReply = useCallback(
    async (content: string) => {
      if (!canInteract) throw new Error('需要登录');
      const targetParentId = comment.parentId || comment.id;
      const reply = await commentApi.createComment(comment.routeId, {
        content,
        parentId: targetParentId,
        replyToUserId: comment.userId,
      });
      const actualParentId = targetParentId;
      if (onAddReply) {
        onAddReply(actualParentId, reply);
      }
      if (!isReply) {
        setLocalReplies((prev) => [...prev, reply]);
        onUpdate(comment.id, (c) => ({
          ...c,
          totalReplyCount: (c.totalReplyCount ?? c.replyCount ?? 0) + 1,
        }));
      }
      success('回复成功');
      setShowReplyInput(false);
      return reply;
    },
    [canInteract, comment.routeId, comment.parentId, comment.id, comment.userId, comment, isReply, onAddReply, onUpdate, success],
  );

  const handleLoadMoreReplies = useCallback(async () => {
    if (isLoadingReplies) return;
    setIsLoadingReplies(true);
    try {
      const result = await commentApi.getReplies(comment.id, { page: replyPage, limit: 10 });
      setLocalReplies((prev) => [...prev, ...result.data]);
      if (onAddReplies) {
        onAddReplies(comment.id, result.data);
      }
      setReplyPage((p) => p + 1);
    } catch (e) {
      error('加载回复失败');
    } finally {
      setIsLoadingReplies(false);
    }
  }, [comment.id, replyPage, isLoadingReplies, onAddReplies, error]);

  const totalReplyCount = comment.totalReplyCount ?? comment.replyCount ?? 0;
  const displayedReplyCount = localReplies.length;
  const shouldShowLoadMore =
    !isReply && totalReplyCount > displayedReplyCount && displayedReplyCount > 0;

  return (
    <div
      className={cn(
        'group',
        isReply ? 'pl-10 ml-4 border-l border-dashed border-theme-border/60' : '',
      )}
    >
      <div className={cn(isReply ? 'py-3 pl-4' : 'py-4')}>
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-theme-hover flex items-center justify-center ring-2 ring-theme-border">
              <User size={16} className="text-theme-text-secondary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-theme-text text-sm">
                {comment.user?.name || '用户' + comment.userId}
              </span>
              {comment.replyToUser && (
                <>
                  <span className="text-theme-text-muted text-xs">回复</span>
                  <span className="text-climbing-orange-400 text-xs">
                    @{comment.replyToUser.name}
                  </span>
                </>
              )}
              <span className="text-xs text-theme-text-muted">
                {formatTime(comment.createdAt)}
              </span>
              {comment.status === 'reported' && (
                <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                  被举报
                </span>
              )}
            </div>

            <p
              className={cn(
                'mt-1.5 text-sm leading-relaxed break-words',
                isDeleted
                  ? 'text-theme-text-muted italic'
                  : 'text-theme-text',
              )}
            >
              {comment.content}
            </p>

            <div className="mt-2 flex items-center gap-1">
              {!isDeleted && (
                <>
                  <button
                    onClick={handleLike}
                    disabled={isLiking || !canInteract}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all',
                      'hover:bg-theme-hover',
                      comment.likedByCurrentUser
                        ? 'text-climbing-orange-400'
                        : 'text-theme-text-muted hover:text-theme-text-secondary',
                      !canInteract && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <ThumbsUp
                      size={13}
                      className={cn(comment.likedByCurrentUser ? 'fill-current' : '')}
                    />
                    <span>{comment.likeCount > 0 ? comment.likeCount : ''}</span>
                  </button>

                  {!isReply && (
                    <button
                      onClick={() => setShowReplyInput((v) => !v)}
                      disabled={!canInteract}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all',
                        'hover:bg-theme-hover text-theme-text-muted hover:text-theme-text-secondary',
                        !canInteract && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <MessageSquare size={13} />
                      <span>回复</span>
                    </button>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShowMenu((v) => !v)}
                      onBlur={() => setTimeout(() => setShowMenu(false), 150)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all',
                        'hover:bg-theme-hover text-theme-text-muted hover:text-theme-text-secondary',
                      )}
                    >
                      <MoreHorizontal size={13} />
                    </button>
                    {showMenu && (
                      <div className="absolute left-0 mt-1 bg-theme-card border border-theme-border rounded-lg shadow-xl z-10 min-w-[120px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={() => {
                            setShowReport(true);
                            setShowMenu(false);
                          }}
                          disabled={isOwner || !canInteract}
                          className="w-full text-left px-3 py-2 text-xs text-theme-text-secondary hover:bg-theme-hover hover:text-theme-text flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Flag size={13} /> 举报
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => {
                              handleDelete();
                              setShowMenu(false);
                            }}
                            disabled={isDeleting}
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 size={13} /> 删除
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {showReplyInput && (
              <div className="mt-3">
                <CommentInput
                  onSubmit={handleReply}
                  replyTarget={{ userName: comment.user?.name || '' }}
                  onCancelReply={() => setShowReplyInput(false)}
                  autoFocus
                  minHeight={60}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {!isReply && localReplies.length > 0 && (
        <div>
          <div className="ml-12 mb-2">
            {!showAllReplies ? (
              <button
                onClick={() => setShowAllReplies(true)}
                className="inline-flex items-center gap-1 text-xs text-climbing-orange-400 hover:text-climbing-orange-300 py-1"
              >
                <ChevronDown size={13} />
                <span>展开 {totalReplyCount} 条回复</span>
              </button>
            ) : (
              <>
                <div className="space-y-0.5">
                  {localReplies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      isReply
                      onUpdate={onUpdate}
                      onAddReply={(parentId, r) => {
                        setLocalReplies((prev) => [...prev, r]);
                        onUpdate(comment.id, (c) => ({
                          ...c,
                          totalReplyCount: (c.totalReplyCount ?? c.replyCount ?? 0) + 1,
                        }));
                        if (onAddReply) onAddReply(parentId, r);
                      }}
                      onAddReplies={onAddReplies}
                      onDelete={(id) => {
                        setLocalReplies((prev) => prev.filter((r) => r.id !== id));
                        if (onDelete) onDelete(id);
                      }}
                      level={level + 1}
                    />
                  ))}
                </div>
                {shouldShowLoadMore && (
                  <button
                    onClick={handleLoadMoreReplies}
                    disabled={isLoadingReplies}
                    className="mt-1 ml-4 inline-flex items-center gap-1 text-xs text-theme-text-muted hover:text-theme-text-secondary py-1.5 disabled:opacity-50"
                  >
                    {isLoadingReplies ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>加载中...</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} />
                        <span>还有 {totalReplyCount - displayedReplyCount} 条更多回复</span>
                      </>
                    )}
                  </button>
                )}
                {totalReplyCount > 3 && (
                  <button
                    onClick={() => setShowAllReplies(false)}
                    className="mt-1 ml-4 inline-flex items-center gap-1 text-xs text-theme-text-muted hover:text-theme-text-secondary py-1.5"
                  >
                    <ChevronUp size={13} />
                    <span>收起回复</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={handleReport}
        userName={comment.user?.name}
      />
    </div>
  );
}
