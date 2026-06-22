import { useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Button from '@/components/UI/Button';
import ThemeToggle from '@/components/UI/ThemeToggle';
import { useThemeStore } from '@/store/theme';
import { useAuthStore } from '@/store/auth';
import { useResponsiveDrawer } from '@/hooks/useResponsiveDrawer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { isOpen, isMobile, toggle, close } = useResponsiveDrawer();
  const { isTransitioning } = useThemeStore();
  const { isAuthenticated } = useAuthStore();
  const { syncFromUser, enableAutoSave } = useThemeStore();

  useEffect(() => {
    if (isAuthenticated) {
      syncFromUser().then(() => {
        enableAutoSave(true);
      });
    } else {
      enableAutoSave(false);
    }
  }, [isAuthenticated, syncFromUser, enableAutoSave]);

  const sidebarVisible = isMobile ? isOpen : true;

  return (
    <div className={isTransitioning ? 'theme-transition' : ''}>
      <div className="min-h-screen bg-theme-bg">
        <Sidebar isOpen={sidebarVisible} isMobile={isMobile} onClose={close} />

        <div
          className={`min-h-screen flex flex-col transition-[padding] duration-300 ${
            !isMobile ? 'lg:ml-64' : ''
          }`}
        >
          <header className="sticky top-0 z-30 bg-theme-subtle/80 backdrop-blur-sm border-b border-theme-border">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-2"
                  onClick={toggle}
                  aria-label={isOpen ? '关闭菜单' : '打开菜单'}
                >
                  <Menu size={24} />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <span className="text-sm text-theme-text-muted hidden sm:inline">当前岩馆：未选择</span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
