import React from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';

/**
 * LoadingBox — Spinner loading căn giữa
 */
export function LoadingBox({ message = 'Đang tải...', size = 36 }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
      <CircularProgress sx={{ color: 'primary.main' }} size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">{message}</Typography>
      )}
    </Box>
  );
}

/**
 * EmptyState — Hiển thị khi không có dữ liệu
 */
export function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5, opacity: 0.8 }}>
      {icon && (
        <Box sx={{ fontSize: 56, lineHeight: 1, mb: 0.5 }}>{icon}</Box>
      )}
      <Typography variant="subtitle1" fontWeight={600} color="text.secondary">{title}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.disabled" textAlign="center" maxWidth={280}>{subtitle}</Typography>
      )}
      {action && onAction && (
        <Button variant="outlined" size="small" onClick={onAction} sx={{ mt: 1, borderColor: 'rgba(245,158,11,0.3)', color: 'primary.main' }}>
          {action}
        </Button>
      )}
    </Box>
  );
}

/**
 * ErrorAlert — Alert lỗi với nút đóng
 */
export function ErrorAlert({ error, onClose }) {
  if (!error) return null;
  return (
    <Alert severity="error" sx={{ mb: 2 }} onClose={onClose}>
      {error}
    </Alert>
  );
}

/**
 * SuccessAlert — Alert thành công với nút đóng
 */
export function SuccessAlert({ message, onClose }) {
  if (!message) return null;
  return (
    <Alert severity="success" sx={{ mb: 2 }} onClose={onClose}>
      {message}
    </Alert>
  );
}

/**
 * PageWrapper — Box bao ngoài với animation fadeInUp
 */
export function PageWrapper({ children, gradient = 'rgba(245,158,11,0.06)' }) {
  return (
    <Box
      className="page-enter"
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: `radial-gradient(ellipse at 20% 0%, ${gradient} 0%, transparent 60%)`,
        py: 3,
      }}
    >
      {children}
    </Box>
  );
}
