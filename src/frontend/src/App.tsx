import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';

import LoginPage from './pages/Auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ProductsPage from './pages/Products/ProductsPage';
import ImportPage from './pages/Import/ImportPage';
import MappingPage from './pages/Mapping/MappingPage';

import 'antd/dist/reset.css';

dayjs.locale('ja');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={jaJP}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/products" element={
              <ProtectedRoute>
                <MainLayout>
                  <ProductsPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/import" element={
              <ProtectedRoute>
                <MainLayout>
                  <ImportPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/mapping" element={
              <ProtectedRoute requireAdmin>
                <MainLayout>
                  <MappingPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;