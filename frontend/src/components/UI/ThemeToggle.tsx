import { Sun, Moon, Monitor, Clock } from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import type { ThemeStrategy } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

const strategies: { value: ThemeStrategy; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'manual', label: '手动切换', icon: Sun },
  { value: 'schedule', label: '定时切换', icon: Clock },
];

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { preferences, resolvedTheme, setStrategy, setManualTheme, toggleManualTheme, isTransitioning } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.theme-toggle-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className={cn('relative theme-toggle-container', className)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (preferences.strategy === 'manual') {
            toggleManualTheme();
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'p-2.5 rounded-lg transition-all duration-200',
          'bg-theme-card hover:bg-theme-hover text-theme-text-secondary hover:text-theme-text',
          isTransitioning && 'theme-transition'
        )}
        title={`当前主题: ${resolvedTheme === 'dark' ? '深色' : '浅色'}`}
      >
        <CurrentIcon size={20} className="transition-transform duration-300" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-theme-card border border-theme-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-theme-border">
            <p className="text-xs font-medium text-theme-text-secondary uppercase tracking-wider">主题策略</p>
          </div>
          <div className="p-2">
            {strategies.map((strategy) => {
              const Icon = strategy.icon;
              const isActive = preferences.strategy === strategy.value;
              return (
                <button
                  key={strategy.value}
                  onClick={() => {
                    setStrategy(strategy.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                    isActive
                      ? 'bg-climbing-orange-500/10 text-climbing-orange-500'
                      : 'text-theme-text-secondary hover:bg-theme-hover hover:text-theme-text'
                  )}
                >
                  <Icon size={18} />
                  <span>{strategy.label}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-climbing-orange-500" />
                  )}
                </button>
              );
            })}
          </div>

          {preferences.strategy === 'manual' && (
            <div className="p-3 border-t border-theme-border">
              <p className="text-xs font-medium text-theme-text-secondary uppercase tracking-wider mb-2">选择主题</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setManualTheme('light')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all duration-200',
                    preferences.manualTheme === 'light'
                      ? 'bg-theme-text text-theme-bg'
                      : 'bg-theme-hover text-theme-text-secondary hover:bg-theme-border'
                  )}
                >
                  <Sun size={16} />
                  <span>浅色</span>
                </button>
                <button
                  onClick={() => setManualTheme('dark')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all duration-200',
                    preferences.manualTheme === 'dark'
                      ? 'bg-theme-subtle text-theme-text border border-theme-border'
                      : 'bg-theme-hover text-theme-text-secondary hover:bg-theme-border'
                  )}
                >
                  <Moon size={16} />
                  <span>深色</span>
                </button>
              </div>
            </div>
          )}

          {preferences.strategy === 'schedule' && (
            <div className="p-3 border-t border-theme-border">
              <p className="text-xs font-medium text-theme-text-secondary uppercase tracking-wider mb-2">定时设置</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-theme-text-secondary">浅色开始</span>
                  <input
                    type="time"
                    value={preferences.schedule.lightStart}
                    onChange={(e) => {
                      useThemeStore.getState().setSchedule({
                        ...preferences.schedule,
                        lightStart: e.target.value,
                      });
                    }}
                    className="bg-theme-hover text-theme-text text-sm rounded px-2 py-1 border border-theme-border focus:outline-none focus:border-climbing-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-theme-text-secondary">深色开始</span>
                  <input
                    type="time"
                    value={preferences.schedule.darkStart}
                    onChange={(e) => {
                      useThemeStore.getState().setSchedule({
                        ...preferences.schedule,
                        darkStart: e.target.value,
                      });
                    }}
                    className="bg-theme-hover text-theme-text text-sm rounded px-2 py-1 border border-theme-border focus:outline-none focus:border-climbing-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
