import { Users, Route, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import Card from '@/components/UI/Card';

export default function Overview() {
  const overviewStats = [
    {
      label: '今日攀爬人次',
      value: '128',
      icon: Users,
      color: 'text-climbing-orange-500',
      bgColor: 'bg-climbing-orange-500/20',
      change: '+12%',
      changeType: 'up' as const,
    },
    {
      label: '当前活跃线路数',
      value: '86',
      icon: Route,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      change: '+5',
      changeType: 'up' as const,
    },
    {
      label: '待审核用户反馈',
      value: '23',
      icon: MessageSquare,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      change: '-3',
      changeType: 'down' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme-text">数据概览</h1>
        <p className="text-theme-text-muted mt-1">岩馆核心运营指标一览</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {overviewStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6 hover:border-theme-border transition-all duration-300 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div className={`p-4 rounded-xl ${stat.bgColor}`}>
                  <Icon size={28} className={stat.color} />
                </div>
                {stat.change && (
                  <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
                    stat.changeType === 'up'
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-red-400 bg-red-500/10'
                  }`}>
                    {stat.changeType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stat.change}
                  </div>
                )}
              </div>
              <div className="mt-5">
                <p className="text-4xl font-bold text-theme-text">{stat.value}</p>
                <p className="text-base text-theme-text-muted mt-2">{stat.label}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
