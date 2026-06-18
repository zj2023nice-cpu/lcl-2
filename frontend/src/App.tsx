import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MessageProvider, MessageContainer } from '@/components/UI/Message';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import WallList from '@/pages/WallList';
import WallDetail from '@/pages/WallDetail';
import RouteList from '@/pages/RouteList';
import RouteDetail from '@/pages/RouteDetail';
import Ascents from '@/pages/Ascents';
import Analytics from '@/pages/Analytics';
import Profile from '@/pages/Profile';
import Dashboard from '@/pages/Dashboard';
import AdminUsers from '@/pages/AdminUsers';
import Overview from '@/pages/Overview';
import OperationLogs from '@/pages/OperationLogs';
import ArchivedRoutes from '@/pages/ArchivedRoutes';
import RouteManagement from '@/pages/RouteManagement';
import MessageTest from '@/pages/MessageTest';
import BadgeShare from '@/pages/BadgeShare';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <MessageProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/message-test" element={<MessageTest />} />
          <Route path="/badge/share/:shareId" element={<BadgeShare />} />

          <Route
            path="/"
            element={
              <ProtectedLayout>
                <Home />
              </ProtectedLayout>
            }
          />
          <Route
            path="/walls"
            element={
              <ProtectedLayout>
                <WallList />
              </ProtectedLayout>
            }
          />
          <Route
            path="/walls/:wallId"
            element={
              <ProtectedLayout>
                <WallDetail />
              </ProtectedLayout>
            }
          />
          <Route
            path="/routes"
            element={
              <ProtectedLayout>
                <RouteList />
              </ProtectedLayout>
            }
          />
          <Route
            path="/routes/:id"
            element={
              <ProtectedLayout>
                <RouteDetail />
              </ProtectedLayout>
            }
          />
          <Route
            path="/ascents"
            element={
              <ProtectedLayout>
                <Ascents />
              </ProtectedLayout>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedLayout>
                <Analytics />
              </ProtectedLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedLayout>
                <Profile />
              </ProtectedLayout>
            }
          />
          <Route
            path="/overview"
            element={
              <ProtectedLayout>
                <Overview />
              </ProtectedLayout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedLayout>
                <AdminUsers />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedLayout>
                <OperationLogs />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin/archived-routes"
            element={
              <ProtectedLayout>
                <ArchivedRoutes />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin/routes"
            element={
              <ProtectedLayout>
                <RouteManagement />
              </ProtectedLayout>
            }
          />
        </Routes>
      </Router>
      <MessageContainer />
    </MessageProvider>
  );
}
