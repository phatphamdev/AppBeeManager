import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import AdminNavbar      from '../../components/AdminNavbar.jsx';
import AdminDashboard   from './AdminDashboard.jsx';
import DispatchPage     from './DispatchPage.jsx';
import DriversPage      from './DriversPage.jsx';
import OrdersPage       from './OrdersPage.jsx';
import ChatCenterPage   from './ChatCenterPage.jsx';

export default function AdminLayout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AdminNavbar />
      <Box component="main" sx={{ flex: 1 }}>
        <Routes>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="dispatch"  element={<DispatchPage />} />
          <Route path="drivers"   element={<DriversPage />} />
          <Route path="orders"    element={<OrdersPage />} />
          <Route path="chat"      element={<ChatCenterPage />} />
          <Route path="*"         element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
