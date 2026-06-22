import { useState, useEffect, useCallback } from 'react';
import { X, Search, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import RoleTag from '@/components/UI/RoleTag';
import { followApi } from '@/utils/api';
import { useMessage } from '@/hooks/useMessage';
import type { FollowUser, FollowListResponse } from '@/types';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  type: 'following' | 'followers';
  currentUserId?: number | null;
}

export default function FollowListModal({
  isOpen,
  onClose,
  userId,
  userName,
  type,
  currentUserId,
}: FollowListModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [limit] = useState(20);
  const [actionLoading, setActionLoading] = useState<Set<number>>(new Set());
  const { success, error } = useMessage();

  const title = type === 'following' ? `${userName}的关注` : `${userName}的粉丝`;

  const fetchUsers = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    try {
      const apiMethod = type === 'following' ? followApi.getFollowingList : followApi.getFollowerList;
      const data: FollowListResponse = await apiMethod(userId, { page, limit, search });
      setUsers(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch follow list:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, userId, type, page, limit, search]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setUsers([]);
    }
  }, [isOpen, type, userId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleFollow = async (targetUserId: number) => {
    if (!currentUserId || actionLoading.has(targetUserId)) return;

    setActionLoading((prev) => new Set(prev).add(targetUserId));
    try {
      await followApi.follow(targetUserId);
      success('关注成功');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? { ...u, isFollowing: true, isMutual: false }
            : u
        )
      );
    } catch (err: any) {
      error(err.message || '关注失败');
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const handleUnfollow = async (targetUserId: number) => {
    if (!currentUserId || actionLoading.has(targetUserId)) return;

    setActionLoading((prev) => new Set(prev).add(targetUserId));
    try {
      await followApi.unfollow(targetUserId);
      success('已取消关注');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? { ...u, isFollowing: false, isMutual: false }
            : u
        )
      );
    } catch (err: any) {
      error(err.message || '取消关注失败');
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="flex flex-col h-[60vh]">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户..."
              className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme-border rounded-lg text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-climbing-orange-500"
            />
          </div>
        </form>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-climbing-orange-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-theme-text-muted">
              {search ? '没有找到匹配的用户' : `暂无${type === 'following' ? '关注' : '粉丝'}`}
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-theme-card hover:bg-theme-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-climbing-orange-500/20 flex items-center justify-center text-climbing-orange-500 font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-theme-text">{user.name}</span>
                      <RoleTag role={user.role} />
                    </div>
                    <div className="text-xs text-theme-text-muted">
                      {type === 'following' ? '关注于' : '关注于'} {formatDate(user.createdAt)}
                      {user.isMutual && (
                        <span className="ml-2 text-climbing-orange-400">· 互相关注</span>
                      )}
                    </div>
                  </div>
                </div>

                {currentUserId && currentUserId !== user.id && (
                  <div>
                    {actionLoading.has(user.id) ? (
                      <Button size="sm" variant="secondary" disabled>
                        <Loader2 size={14} className="animate-spin mr-1" />
                        处理中
                      </Button>
                    ) : user.isFollowing ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUnfollow(user.id)}
                        className="hover:bg-red-500/20 hover:text-red-400"
                      >
                        <UserCheck size={14} className="mr-1" />
                        {user.isMutual ? '互相关注' : '已关注'}
                      </Button>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => handleFollow(user.id)}>
                        <UserPlus size={14} className="mr-1" />
                        关注
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-theme-border">
            <span className="text-sm text-theme-text-muted">
              共 {total} 人
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                上一页
              </Button>
              <span className="text-sm text-theme-text-muted">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
