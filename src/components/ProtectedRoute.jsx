import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * ProtectedRoute — Bảo vệ route theo role.
 *
 * Props:
 *   allowedRole: 'ADMIN' | 'SHIPPER' | null (null = chỉ cần đăng nhập)
 *   children: JSX element cần bảo vệ
 */
export default function ProtectedRoute({ children, allowedRole = null }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  /* ── Đang load session ────────────────────────────────── */
  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress sx={{ color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Đang xác thực...
        </Typography>
      </Box>
    );
  }

  /* ── Chưa đăng nhập → về /login ──────────────────────── */
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  /* ── Sai role → redirect về trang phù hợp ────────────── */
  if (allowedRole && role !== allowedRole) {
    if (role === 'ADMIN')   return <Navigate to="/admin/dashboard" replace />;
    if (role === 'SHIPPER') return <Navigate to="/shipper/workspace" replace />;
    // Role chưa được gán
    return <Navigate to="/login" replace />;
  }

  return children;
}
