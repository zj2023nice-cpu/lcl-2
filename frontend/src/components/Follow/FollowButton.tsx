import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { followApi } from '@/utils/api';
import { useMessage } from '@/hooks/useMessage';
import type { FollowStatus } from '@/types';

interface FollowButtonProps {
  targetUserId: number;
  currentUserId?: number | null;
  size?: 'sm' | 'md' | 'lg';
  onStatusChange?: (status: FollowStatus) => void;
}

export default function FollowButton({
  targetUserId,
  currentUserId,
  size = 'md',
  onStatusChange,
}: FollowButtonProps) {
  const [status, setStatus] = useState<FollowStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { success, error } = useMessage();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };

  useEffect(() => {
    if (!currentUserId || currentUserId === targetUserId) {
      setStatus(null);
      return;
    }

    const fetchStatus = async () => {
      setLoading(true);
      try {
        const data = await followApi.getFollowStatus(targetUserId);
        setStatus(data);
        onStatusChange?.(data);
      } catch (err) {
        console.error('Failed to fetch follow status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [targetUserId, currentUserId, onStatusChange]);

  const handleFollow = async () => {
    if (!currentUserId || actionLoading) return;

    setActionLoading(true);
    try {
      await followApi.follow(targetUserId);
      const newStatus = await followApi.getFollowStatus(targetUserId);
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      success('关注成功');
    } catch (err: any) {
      error(err.message || '关注失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserId || actionLoading) return;

    setActionLoading(true);
    try {
      await followApi.unfollow(targetUserId);
      const newStatus = await followApi.getFollowStatus(targetUserId);
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      success('已取消关注');
    } catch (err: any) {
      error(err.message || '取消关注失败');
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentUserId || currentUserId === targetUserId) {
    return null;
  }

  if (loading || !status) {
    return (
      <button
        disabled
        className={`${sizeClasses[size]} flex items-center gap-2 rounded-lg bg-theme-border text-theme-text-muted cursor-not-allowed`}
      >
        <Loader2 size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} className="animate-spin" />
        加载中
      </button>
    );
  }

  if (status.isFollowing) {
    return (
      <button
        onClick={handleUnfollow}
        disabled={actionLoading}
        className={`${sizeClasses[size]} flex items-center gap-2 rounded-lg bg-theme-border hover:bg-red-500/20 hover:text-red-400 text-theme-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {actionLoading ? (
          <Loader2 size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} className="animate-spin" />
        ) : (
          <UserCheck size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
        )}
        {status.isMutual ? '互相关注' : '已关注'}
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={actionLoading}
      className={`${sizeClasses[size]} flex items-center gap-2 rounded-lg bg-climbing-orange-500 hover:bg-climbing-orange-400 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {actionLoading ? (
        <Loader2 size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} className="animate-spin" />
      ) : (
        <UserPlus size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
      )}
      关注
    </button>
  );
}
