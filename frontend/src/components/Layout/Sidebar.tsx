import { NavLink } from 'react-router-dom';
import {
  Home,
  Mountain,
  Route,
  ListTodo,
  BarChart3,
  User,
  LayoutDashboard,
  Users,
  PieChart,
  FileText,
  Archive,
  Layers,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: '首页', icon: Home },
  { path: '/overview', label: '数据概览', icon: PieChart, adminOnly: true },
  { path: '/walls', label: '岩壁', icon: Mountain },
  { path: '/routes', label: '线路', icon: Route },
  { path: '/ascents', label: '攀爬记录', icon: ListTodo },
  { path: '/analytics', label: '个人分析', icon: BarChart3 },
  { path: '/profile', label: '个人中心', icon: User },
  { path: '/dashboard', label: '运营数据', icon: LayoutDashboard, adminOnly: true },
  { path: '/admin/users', label: '用户管理', icon: Users, adminOnly: true },
  { path: '/admin/routes', label: '线路管理', icon: Layers, adminOnly: true },
  { path: '/admin/archived-routes', label: '归档线路', icon: Archive, adminOnly: true },
  { path: '/admin/logs', label: '操作日志', icon: FileText, adminOnly: true },
];

interface SidebarProps {
  isOpen?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, isMobile = false, onClose }: SidebarProps) {
  useEffect(() => {
    if (isMobile && isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobile, isOpen]);

  const asideClasses = cn(
    'fixed left-0 top-0 h-full w-64 bg-theme-subtle border-r border-theme-border z-50 flex flex-col',
    isMobile
      ? 'transition-transform duration-300 ease-out'
      : 'transition-transform duration-300 lg:translate-x-0',
    !isOpen && '-translate-x-full'
  );

  return (
    <>
      {isMobile && (
        <div
          className={cn(
            'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={asideClasses}
        aria-hidden={!isOpen}
        role={isMobile ? 'dialog' : undefined}
        aria-modal={isMobile ? 'true' : undefined}
      >
        <div className="p-6 border-b border-theme-border flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-climbing-orange-500 rounded-lg flex items-center justify-center">
              <Mountain size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-theme-text">攀岩</h1>
              <p className="text-xs text-theme-text-muted">Climbing App</p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 -mr-2 -mt-2 rounded-lg text-theme-text-secondary hover:bg-theme-card hover:text-theme-text transition-colors"
              aria-label="关闭菜单"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-climbing-orange-500/10 text-climbing-orange-500 border-l-2 border-climbing-orange-500'
                      : 'text-theme-text-secondary hover:bg-theme-card hover:text-theme-text'
                  )
                }
                onClick={onClose}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-theme-border">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-card">
            <div className="w-10 h-10 bg-theme-hover rounded-full flex items-center justify-center">
              <User size={20} className="text-theme-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-theme-text truncate">用户名</p>
              <p className="text-xs text-theme-text-muted truncate">user@example.com</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
