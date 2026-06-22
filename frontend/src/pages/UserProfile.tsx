import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  ArrowLeft,
  Loader2,
  Award,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import RoleTag from '@/components/UI/RoleTag';
import useAuthStore from '@/store/auth';
import type { UserRole, FollowStatus, UserBadge, BadgeStats } from '@/types';
import { userApi, followApi, badgeApi } from '@/utils/api';
import { FollowButton, FollowListModal } from '@/components/Follow';
import {
  BadgeGallery,
  BadgeDetailModal,
  BadgeCard,
} from '@/components/Badge';

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    id: number;
    name: string;
    role: UserRole;
    verifiedAt?: string;
    createdAt: string;
    followingCount: number;
    followerCount: number;
  } | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [followModalType, setFollowModalType] = useState<'following' | 'followers' | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges'>('overview');
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [badgeStats, setBadgeStats] = useState<BadgeStats | null>(null);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    const id = parseInt(userId, 10);
    if (isNaN(id)) return;

    setLoading(true);
    try {
      const [profileData, followData, badgeData] = await Promise.all([
        userApi.getUserById(id),
        followApi.getFollowStatus(id).catch(() => null),
        badgeApi.getUserBadges(id).catch(() => null),
      ]);

      setUserProfile(profileData);
      if (followData) {
        setFollowStatus(followData);
      }
      if (badgeData) {
        setBadges(badgeData.badges);
        setBadgeStats(badgeData.stats);
      }
    } catch (err) {
      console.error('获取用户资料失败:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleFollowStatusChange = (status: FollowStatus) => {
    setFollowStatus(status);
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        followingCount: status.followingCount,
        followerCount: status.followerCount,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-climbing-orange-500" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-theme-text-muted mb-4">用户不存在</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-1" />
          返回
        </Button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userProfile.id;
  const unlockedBadges = badges.filter((b) => b.unlocked);
  const recentBadges = unlockedBadges.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-theme-text">用户资料</h1>
          <p className="text-theme-text-muted mt-1">查看用户的攀岩记录和成就</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-theme-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 font-medium text-sm transition-colors relative ${
            activeTab === 'overview'
              ? 'text-climbing-orange-500'
              : 'text-theme-text-secondary hover:text-theme-text'
          }`}
        >
          概览
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-climbing-orange-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2.5 font-medium text-sm transition-colors relative ${
            activeTab === 'badges'
              ? 'text-climbing-orange-500'
              : 'text-theme-text-secondary hover:text-theme-text'
          }`}
        >
          成就徽章
          {badgeStats && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-climbing-orange-500/20 text-climbing-orange-500">
              {badgeStats.unlocked}/{badgeStats.total}
            </span>
          )}
          {activeTab === 'badges' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-climbing-orange-500" />
          )}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="p-6">
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-climbing-orange-400 to-climbing-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-climbing-orange-500/30">
                      <User size={40} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-xl font-bold text-theme-text">
                        {userProfile.name}
                      </h2>
                      <RoleTag role={userProfile.role} highlight="current" size="sm" />
                      {userProfile.verifiedAt && (
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          已认证
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-theme-text-muted mt-1">ID: {userProfile.id}</p>
                    <p className="text-sm text-theme-text-muted mt-1">
                      加入时间: {new Date(userProfile.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  {!isOwnProfile && currentUser && (
                    <div className="flex-shrink-0">
                      <FollowButton
                        targetUserId={userProfile.id}
                        currentUserId={currentUser.id}
                        size="lg"
                        onStatusChange={handleFollowStatusChange}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-theme-border">
                  <button
                    onClick={() => setFollowModalType('following')}
                    className="text-center p-3 bg-theme-subtle/50 rounded-lg hover:bg-theme-hover transition-colors"
                  >
                    <p className="text-2xl font-bold text-climbing-orange-500">
                      {followStatus?.followingCount ?? userProfile.followingCount}
                    </p>
                    <p className="text-xs text-theme-text-muted mt-1">关注</p>
                  </button>
                  <button
                    onClick={() => setFollowModalType('followers')}
                    className="text-center p-3 bg-theme-subtle/50 rounded-lg hover:bg-theme-hover transition-colors"
                  >
                    <p className="text-2xl font-bold text-green-400">
                      {followStatus?.followerCount ?? userProfile.followerCount}
                    </p>
                    <p className="text-xs text-theme-text-muted mt-1">粉丝</p>
                  </button>
                  <div className="text-center p-3 bg-theme-subtle/50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-400">-</p>
                    <p className="text-xs text-theme-text-muted mt-1">最高难度</p>
                  </div>
                </div>
              </div>
            </Card>

            {badgeStats && (
              <Card>
                <div className="p-4 border-b border-theme-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <Award size={20} className="text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-theme-text">我的成就</h3>
                        <p className="text-xs text-theme-text-muted">
                          已解锁 {badgeStats.unlocked}/{badgeStats.total} 个徽章
                        </p>
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-xl font-bold text-amber-500">{badgeStats.totalPoints}</p>
                      <p className="text-xs text-theme-text-muted">总积分</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {badgesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-climbing-orange-500" />
                    </div>
                  ) : recentBadges.length > 0 ? (
                    <div className="flex items-center gap-6 overflow-x-auto pb-2">
                      {recentBadges.map((userBadge) => (
                        <div
                          key={userBadge.id}
                          onClick={() => setSelectedBadge(userBadge)}
                          className="flex-shrink-0 cursor-pointer"
                        >
                          <BadgeCard
                            userBadge={userBadge}
                            size="md"
                            showProgress={false}
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => setActiveTab('badges')}
                        className="flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-theme-border hover:border-climbing-orange-500 transition-colors group"
                      >
                        <span className="text-xs text-theme-text-muted group-hover:text-climbing-orange-500">查看全部</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Award size={32} className="mx-auto text-theme-border mb-2" />
                      <p className="text-theme-text-muted text-sm">暂无已解锁的徽章</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <div className="p-5 border-b border-theme-border">
                <h3 className="font-semibold text-theme-text">基本信息</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-theme-hover">
                    <User size={16} className="text-theme-text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-theme-text-muted">用户名</p>
                    <p className="text-theme-text font-medium">{userProfile.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-theme-hover">
                    <Calendar size={16} className="text-theme-text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-theme-text-muted">加入时间</p>
                    <p className="text-theme-text font-medium">
                      {new Date(userProfile.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'badges' && badgeStats && (
        <div>
          {badgesLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-climbing-orange-500" />
            </div>
          ) : (
            <BadgeGallery
              badges={badges}
              stats={badgeStats}
              onBadgeClick={setSelectedBadge}
            />
          )}
        </div>
      )}

      {selectedBadge && (
        <BadgeDetailModal
          isOpen={!!selectedBadge}
          onClose={() => setSelectedBadge(null)}
          userBadge={selectedBadge}
          onGeneratePoster={() => {}}
        />
      )}

      {followModalType && userProfile && currentUser && (
        <FollowListModal
          isOpen={!!followModalType}
          onClose={() => setFollowModalType(null)}
          userId={userProfile.id}
          userName={userProfile.name}
          type={followModalType}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  );
}
