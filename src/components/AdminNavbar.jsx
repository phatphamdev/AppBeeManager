import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, Chip,
  IconButton, Drawer, List, ListItem, ListItemButton,
  ListItemText, useMediaQuery, useTheme, Avatar, Tooltip,
} from '@mui/material';
import MenuIcon                    from '@mui/icons-material/Menu';
import CalculateRoundedIcon        from '@mui/icons-material/CalculateRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import PeopleRoundedIcon           from '@mui/icons-material/PeopleRounded';
import AssignmentRoundedIcon       from '@mui/icons-material/AssignmentRounded';
import ChatRoundedIcon             from '@mui/icons-material/ChatRounded';
import LogoutRoundedIcon           from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../contexts/AuthContext.jsx';

const navItems = [
  { label: 'Điều Phối',  path: '/admin/dispatch',  icon: <CalculateRoundedIcon fontSize="small" /> },
  { label: 'Tài Xế',    path: '/admin/drivers',   icon: <PeopleRoundedIcon fontSize="small" /> },
  { label: 'Đơn Hàng',  path: '/admin/orders',    icon: <AssignmentRoundedIcon fontSize="small" /> },
  { label: 'Chat',       path: '/admin/chat',      icon: <ChatRoundedIcon fontSize="small" /> },
  { label: 'Quản Trị',  path: '/admin/dashboard', icon: <AdminPanelSettingsRoundedIcon fontSize="small" /> },
];

export default function AdminNavbar() {
  const location   = useLocation();
  const theme      = useTheme();
  const navigate   = useNavigate();
  const isMobile   = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, role, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(15, 15, 20, 0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(241, 240, 239, 0.08)',
          top: 0,
          zIndex: 1100,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
          {/* Logo */}
          <Box
            component={Link}
            to="/admin/dashboard"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.2, textDecoration: 'none', mr: 3 }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 14px rgba(245,158,11,0.35)',
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={`${import.meta.env.BASE_URL}iconBee.jpg`}
                alt="BeeShip Icon"
                onError={(e) => { e.target.style.display = 'none'; }}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
              />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#f1f0ef', letterSpacing: '-0.5px' }}>
              Bee<Box component="span" sx={{ color: 'primary.main' }}>Ship</Box>
            </Typography>
            <Chip
              label="ADMIN"
              size="small"
              sx={{
                fontSize: '0.6rem', fontWeight: 700, height: 18, letterSpacing: '0.05em',
                bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.light',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            />
          </Box>

          {/* Desktop nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
              {navItems.map((item) => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    startIcon={item.icon}
                    size="small"
                    sx={{
                      color: active ? 'primary.main' : 'text.secondary',
                      fontWeight: active ? 700 : 500,
                      px: 1.5,
                      bgcolor: active ? 'rgba(245,158,11,0.08)' : 'transparent',
                      borderRadius: 2,
                      '&:hover': { color: 'primary.light', bgcolor: 'rgba(245,158,11,0.08)' },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          )}

          <Box sx={{ flex: isMobile ? 1 : 0 }} />

          {/* User info + Logout */}
          {!isMobile && user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(245,158,11,0.2)', fontSize: '0.75rem', color: 'primary.main' }}>
                {user.email?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </Typography>
              <Tooltip title="Đăng xuất">
                <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                  <LogoutRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Mobile menu icon */}
          {isMobile && (
            <IconButton edge="end" onClick={() => setDrawerOpen(true)} sx={{ color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 260, bgcolor: 'background.paper' } }}
      >
        <Box sx={{ pt: 3, px: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={2}>
            BeeShip Admin
          </Typography>
          <List disablePadding>
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    selected={active}
                    sx={{ borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main' } }}
                  >
                    <Box sx={{ mr: 1.5, display: 'flex', color: active ? 'primary.main' : 'text.secondary' }}>{item.icon}</Box>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(241,240,239,0.08)' }}>
            <Button
              fullWidth
              startIcon={<LogoutRoundedIcon />}
              onClick={handleLogout}
              sx={{ color: 'error.main', justifyContent: 'flex-start', borderRadius: 2 }}
            >
              Đăng xuất
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
