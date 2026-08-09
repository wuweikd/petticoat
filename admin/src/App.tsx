import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { AdminLayout } from './layouts/AdminLayout';
import { BrandsPage } from './pages/BrandsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ItemsPage } from './pages/ItemsPage';
import { LoginPage } from './pages/LoginPage';
import { PostsPage } from './pages/PostsPage';
import { UsersPage } from './pages/UsersPage';
import { RequireAuth } from './RequireAuth';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/brands" element={<BrandsPage />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/posts" element={<PostsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
