import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Pages
import LoginPage      from './pages/LoginPage.jsx';
import AdminLayout    from './pages/admin/AdminLayout.jsx';
import ShipperLayout  from './pages/shipper/ShipperLayout.jsx';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <Routes>
            {/* Trang đăng nhập */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin — chỉ role ADMIN */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRole="ADMIN">
                  <AdminLayout />
                </ProtectedRoute>
              }
            />

            {/* Shipper — chỉ role SHIPPER */}
            <Route
              path="/shipper/*"
              element={
                <ProtectedRoute allowedRole="SHIPPER">
                  <ShipperLayout />
                </ProtectedRoute>
              }
            />

            {/* Root → login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Box>
      </HashRouter>
    </AuthProvider>
  );
}
