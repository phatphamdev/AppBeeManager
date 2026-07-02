import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

/**
 * STATUS_CONFIGS — Dùng chung giữa Admin và Shipper components
 */
export const DRIVER_STATUS = {
  OFFLINE:    { label: 'Ngoại tuyến', color: '#a09d9a', bg: 'rgba(160,157,154,0.12)' },
  IDLE:       { label: 'Sẵn sàng',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  PICKING_UP: { label: 'Đang đón',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  DELIVERING: { label: 'Đang giao',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

export const ORDER_STATUS = {
  PENDING:   { label: 'Chờ nhận', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  ACCEPTED:  { label: 'Đã nhận',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'  },
  COMPLETED: { label: 'Hoàn tất', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
};

/**
 * DriverStatusChip — Hiển thị trạng thái tài xế
 */
export function DriverStatusChip({ status, size = 'small' }) {
  const cfg = DRIVER_STATUS[status] || DRIVER_STATUS.OFFLINE;
  return (
    <Chip
      icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: `${cfg.color} !important` }} />}
      label={cfg.label}
      size={size}
      sx={{
        fontWeight: 700,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        bgcolor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
      }}
    />
  );
}

/**
 * OrderStatusChip — Hiển thị trạng thái đơn hàng
 */
export function OrderStatusChip({ status, size = 'small' }) {
  const cfg = ORDER_STATUS[status] || ORDER_STATUS.PENDING;
  return (
    <Chip
      icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: `${cfg.color} !important` }} />}
      label={cfg.label}
      size={size}
      sx={{
        fontWeight: 700,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        bgcolor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
      }}
    />
  );
}

/**
 * LiveBadge — Hiển thị badge "LIVE" chớp nháy
 */
export function LiveBadge() {
  return (
    <Chip
      label="● LIVE"
      size="small"
      sx={{
        bgcolor: 'rgba(74,222,128,0.15)',
        color: '#4ade80',
        fontWeight: 700,
        fontSize: '0.65rem',
        height: 20,
        animation: 'liveFlash 2s ease-in-out infinite',
        '@keyframes liveFlash': {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.4 },
        },
      }}
    />
  );
}

/**
 * SectionHeader — Header chuẩn cho mỗi trang Admin
 */
export function SectionHeader({ icon, title, subtitle }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1.5,
          bgcolor: 'rgba(245,158,11,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">{title}</Typography>
      </Box>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" ml={6}>{subtitle}</Typography>
      )}
    </Box>
  );
}

/**
 * formatVND — Format tiền VND
 */
export const formatVND = (value) => {
  if (value == null) return '';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

/**
 * formatDateTime — Format ngày giờ tiếng Việt
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/**
 * DevExtreme shared grid styles
 */
export const gridSx = {
  '& .dx-datagrid': {
    backgroundColor: 'transparent',
    color: '#f1f0ef',
    fontFamily: 'Inter, sans-serif',
  },
  '& .dx-datagrid-headers .dx-datagrid-table .dx-row > td': {
    backgroundColor: 'rgba(241,240,239,0.04)',
    color: '#a09d9a',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(241,240,239,0.1)',
  },
  '& .dx-datagrid-rowsview .dx-row': {
    borderBottom: '1px solid rgba(241,240,239,0.05)',
  },
  '& .dx-datagrid-rowsview .dx-row:hover': {
    backgroundColor: 'rgba(245,158,11,0.06) !important',
  },
  '& .dx-toolbar': { backgroundColor: 'transparent', marginBottom: 1 },
  '& .dx-button': {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.25)',
    color: '#fcd34d',
    borderRadius: 6,
  },
  '& .dx-button:hover': { backgroundColor: 'rgba(245,158,11,0.2)' },
  '& .dx-pager': { color: '#a09d9a', backgroundColor: 'transparent' },
  '& .dx-pages': { color: '#a09d9a' },
};
