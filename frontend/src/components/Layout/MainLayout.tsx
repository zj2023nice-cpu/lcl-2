import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Button from '@/components/UI/Button';
import ThemeToggle from '@/components/UI/ThemeToggle';
import { useThemeStore } from '@/store/theme';
import { useAuthStore } from '@/store/auth';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  return (
    <div className={isTransitioning ? 'theme-transition' : ''}>
      <div className="min-h-screen bg-rock-dark-950">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="lg:ml-64 min-h-screen flex flex-col">
          <header className="sticky top-0 z-30 bg-rock-dark-900/80 backdrop-blur-sm border-b border-rock-dark-800">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-2"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu size={24} />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <span className="text-sm text-rock-light-500">当前岩馆：未选择</span>
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
