import { useState } from 'react';
import { Award, Filter, Grid3X3, List, Search } from 'lucide-react';
import BadgeCard from './BadgeCard';
import type { UserBadge, BadgeRarity, BadgeCategory, BadgeStats } from '@/types';

const rarityLabels: Record<BadgeRarity, string> = {
  common: '普通',
  rare: '稀有',
  legendary: '传说',
};

const categoryLabels: Record<BadgeCategory, string> = {
  climbing_frequency: '攀爬次数',
  grade_achievement: '难度成就',
  checkin_streak: '连续打卡',
  social_interaction: '社交互动',
  special: '特殊成就',
};

interface BadgeGalleryProps {
  badges: UserBadge[];
  stats: BadgeStats;
  onBadgeClick: (badge: UserBadge) => void;
}

type FilterType = 'all' | 'unlocked' | 'locked' | BadgeRarity;

export default function BadgeGallery({ badges, stats, onBadgeClick }: BadgeGalleryProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<BadgeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredBadges = badges.filter((ub) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'unlocked' && ub.unlocked) ||
      (filter === 'locked' && !ub.unlocked) ||
      ub.badge?.rarity === filter;

    const matchesCategory =
      categoryFilter === 'all' || ub.badge?.category === categoryFilter;

    const matchesSearch =
      searchQuery === '' ||
      ub.badge?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ub.badge?.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesCategory && matchesCategory;
  });

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-rock-dark-800/50 rounded-xl p-4 border border-rock-dark-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-climbing-orange-500/20">
              <Award size={20} className="text-climbing-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalPoints}</p>
              <p className="text-xs text-rock-light-500">总积分</p>
            </div>
          </div>
        </div>
        <div className="bg-rock-dark-800/50 rounded-xl p-4 border border-rock-dark-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Award size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {unlockedCount}/{stats.total}
              </p>
              <p className="text-xs text-rock-light-500">已解锁</p>
            </div>
          </div>
        </div>
        <div className="bg-rock-dark-800/50 rounded-xl p-4 border border-rock-dark-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Award size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.rare.unlocked}/{stats.rare.total}
              </p>
              <p className="text-xs text-rock-light-500">稀有徽章</p>
            </div>
          </div>
        </div>
        <div className="bg-rock-dark-800/50 rounded-xl p-4 border border-rock-dark-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Award size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.legendary.unlocked}/{stats.legendary.total}
              </p>
              <p className="text-xs text-rock-light-500">传说徽章</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500"
          />
          <input
            type="text"
            placeholder="搜索徽章..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-rock-dark-800 border border-rock-dark-700 rounded-lg text-white placeholder-rock-light-500 focus:outline-none focus:border-climbing-orange-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-rock-light-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="bg-rock-dark-800 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
          >
            <option value="all">全部</option>
            <option value="unlocked">已解锁</option>
            <option value="locked">未解锁</option>
            <option value="common">普通</option>
            <option value="rare">稀有</option>
            <option value="legendary">传说</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as BadgeCategory | 'all')}
            className="bg-rock-dark-800 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
          >
            <option value="all">全部分类</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 bg-rock-dark-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-rock-dark-700 text-white' : 'text-rock-light-500 hover:text-white'}`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-rock-dark-700 text-white' : 'text-rock-light-500 hover:text-white'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(rarityLabels) as BadgeRarity[]).map((rarity) => {
          const count = badges.filter(
            (b) => b.badge?.rarity === rarity && b.unlocked
          ).length;
          const total = badges.filter((b) => b.badge?.rarity === rarity).length;
          const colors: Record<BadgeRarity, string> = {
            common: 'bg-green-500/20 text-green-400 border-green-500/30',
            rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            legendary: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          };
          return (
            <span
              key={rarity}
              className={`px-3 py-1 text-xs rounded-full border ${colors[rarity]}`}
            >
              {rarityLabels[rarity]}: {count}/{total}
            </span>
          );
        })}
      </div>

      {filteredBadges.length === 0 ? (
        <div className="text-center py-12">
          <Award size={48} className="mx-auto text-rock-dark-600 mb-4" />
          <p className="text-rock-light-500">没有找到匹配的徽章</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
          {filteredBadges.map((userBadge) => (
            <BadgeCard
              key={userBadge.id}
              userBadge={userBadge}
              onClick={() => onBadgeClick(userBadge)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBadges.map((userBadge) => (
            <div
              key={userBadge.id}
              onClick={() => onBadgeClick(userBadge)}
              className="flex items-center gap-4 p-4 bg-rock-dark-800/50 rounded-xl border border-rock-dark-700 hover:border-rock-dark-600 cursor-pointer transition-colors"
            >
              <BadgeCard
                userBadge={userBadge}
                size="sm"
                showProgress={false}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-white">{userBadge.badge?.name}</h4>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      userBadge.badge?.rarity === 'legendary'
                        ? 'bg-amber-500/20 text-amber-400'
                        : userBadge.badge?.rarity === 'rare'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {userBadge.badge ? rarityLabels[userBadge.badge.rarity] : ''}
                  </span>
                  {userBadge.unlocked && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                      已解锁
                    </span>
                  )}
                </div>
                <p className="text-sm text-rock-light-500 mt-1">
                  {userBadge.badge?.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">
                  {userBadge.badge?.points}
                </p>
                <p className="text-xs text-rock-light-500">积分</p>
              </div>
              {!userBadge.unlocked && (
                <div className="w-24">
                  <div className="h-2 bg-rock-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-400 rounded-full"
                      style={{ width: `${Math.min(100, userBadge.progress)}%` }}
                    />
                  </div>
                  <p className="text-xs text-rock-light-500 text-center mt-1">
                    {Math.round(userBadge.progress)}%
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
