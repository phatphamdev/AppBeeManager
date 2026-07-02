import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Box, BottomNavigation, BottomNavigationAction, Paper, Avatar, Typography, IconButton } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../../contexts/AuthContext.jsx';
import ShipperWorkspace from './ShipperWorkspace.jsx';
import ShipperChat from './ShipperChat.jsx';

export default function ShipperLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  // Determine active tab based on path
  const getTabValue = () => {
    if (location.pathname.includes('/shipper/chat')) return 1;
    return 0;
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Box sx={{ pb: 7, bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top App Bar for Mobile */}
      <Paper elevation={0} sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        bgcolor: 'rgba(26,26,36,0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(241,240,239,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
           <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={`${import.meta.env.BASE_URL}iconBee.jpg`}
                alt="BeeShip"
                onError={(e) => { e.target.style.display = 'none'; }}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} lineHeight={1.2}>Shipper Portal</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email?.split('@')[0]}</Typography>
            </Box>
        </Box>
        <IconButton size="small" onClick={handleLogout} sx={{ color: 'error.main' }}>
          <LogoutRoundedIcon />
        </IconButton>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 2 }}>
        <Routes>
          <Route path="workspace" element={<ShipperWorkspace />} />
          <Route path="chat" element={<ShipperChat />} />
          <Route path="*" element={<Navigate to="workspace" replace />} />
        </Routes>
      </Box>

      {/* Bottom Navigation */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, borderTop: '1px solid rgba(241,240,239,0.08)' }} elevation={8}>
        <BottomNavigation
          showLabels
          value={getTabValue()}
          sx={{ 
            bgcolor: 'rgba(26,26,36,0.98)',
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              }
            }
          }}
        >
          <BottomNavigationAction 
            component={Link} 
            to="/shipper/workspace" 
            label="Đơn Hàng" 
            icon={<DashboardRoundedIcon />} 
          />
          <BottomNavigationAction 
            component={Link} 
            to="/shipper/chat" 
            label="Tin Nhắn" 
            icon={<ChatRoundedIcon />} 
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
