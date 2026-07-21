import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Avatar,
  BottomNavigation, BottomNavigationAction, Paper, Drawer,
  List, ListItem, ListItemButton, ListItemText, Divider,
  useMediaQuery, useTheme,
} from '@mui/material';
import HomeRoundedIcon       from '@mui/icons-material/HomeRounded';
import AddCircleRoundedIcon  from '@mui/icons-material/AddCircleRounded';
import ListAltRoundedIcon    from '@mui/icons-material/ListAltRounded';
import LogoutRoundedIcon     from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon       from '@mui/icons-material/MenuRounded';
import { useAuth }           from '../../contexts/AuthContext.jsx';
import CustomerHomePage      from './CustomerHomePage.jsx';
import CustomerOrderPage     from './CustomerOrderPage.jsx';
import CustomerMyOrdersPage  from './CustomerMyOrdersPage.jsx';

const NAV_ITEMS = [
  { label: 'Trang chủ', path: '/customer/home',      icon: <HomeRoundedIcon /> },
  { label: 'Đặt dịch vụ', path: '/customer/order',  icon: <AddCircleRoundedIcon /> },
  { label: 'Đơn của tôi', path: '/customer/orders', icon: <ListAltRoundedIcon /> },
];

export default function CustomerLayout() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const theme      = useTheme();
  const isMobile   = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentNav = NAV_ITEMS.findIndex(n =>
    location.pathname === n.path || location.pathname.startsWith(n.path + '/')
  );
  const activeIndex = currentNav === -1 ? 0 : currentNav;

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: isMobile ? '72px' : 0 }}>
      {/* Top AppBar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(15,15,20,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(241,240,239,0.08)',
          zIndex: 1100,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: { xs: 56, sm: 64 } }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flex: 1 }}>
            <Box
              sx={{
                width: 32, height: 32, borderRadius: 1.5,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px rgba(245,158,11,0.3)', overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={`${import.meta.env.BASE_URL}iconBee.jpg`}
                alt="BeeShip"
                onError={e => { e.target.style.display = 'none'; }}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.4px">
              Bee<Box component="span" sx={{ color: 'primary.main' }}>Ship</Box>
            </Typography>
          </Box>

          {/* Desktop nav links */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
              {NAV_ITEMS.map(item => {
                const active = location.pathname.startsWith(item.path);
                return (
                  <Box
                    key={item.path}
                    component={Link}
                    to={item.path}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      px: 1.5, py: 0.75, borderRadius: 2,
                      textDecoration: 'none',
                      fontSize: '0.875rem', fontWeight: active ? 700 : 500,
                      color: active ? 'primary.main' : 'text.secondary',
                      bgcolor: active ? 'rgba(245,158,11,0.08)' : 'transparent',
                      '&:hover': { color: 'primary.light', bgcolor: 'rgba(245,158,11,0.06)' },
                      transition: 'all 0.2s',
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Avatar + Menu */}
          <Avatar
            sx={{
              width: 32, height: 32,
              bgcolor: 'rgba(245,158,11,0.18)',
              fontSize: '0.75rem', color: 'primary.main',
              cursor: 'pointer',
            }}
            onClick={() => setDrawerOpen(true)}
          >
            {user?.email?.[0]?.toUpperCase()}
          </Avatar>

          {isMobile && (
            <IconButton size="small" onClick={() => setDrawerOpen(true)} sx={{ ml: 0.5, color: 'text.primary' }}>
              <MenuRoundedIcon fontSize="small" />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Side Drawer (user menu) */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 240, bgcolor: 'background.paper' } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(245,158,11,0.18)', color: 'primary.main' }}>
              {user?.email?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>Khách hàng</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 140, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 1.5, borderColor: 'rgba(241,240,239,0.08)' }} />
          <List disablePadding>
            {NAV_ITEMS.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    component={Link} to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    selected={active}
                    sx={{
                      borderRadius: 2, mb: 0.5,
                      '&.Mui-selected': { bgcolor: 'rgba(245,158,11,0.1)', color: 'primary.main' },
                    }}
                  >
                    <Box sx={{ mr: 1.5, display: 'flex', color: active ? 'primary.main' : 'text.secondary' }}>
                      {item.icon}
                    </Box>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Divider sx={{ my: 1.5, borderColor: 'rgba(241,240,239,0.08)' }} />
          <ListItemButton
            onClick={handleLogout}
            sx={{ borderRadius: 2, color: 'error.main' }}
          >
            <LogoutRoundedIcon sx={{ mr: 1.5, fontSize: 20 }} />
            <ListItemText primary="Đăng xuất" />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ minHeight: 'calc(100vh - 56px)' }}>
        <Routes>
          <Route path="home"   element={<CustomerHomePage />} />
          <Route path="order"  element={<CustomerOrderPage />} />
          <Route path="orders" element={<CustomerMyOrdersPage />} />
          <Route path="*"      element={<CustomerHomePage />} />
        </Routes>
      </Box>

      {/* Bottom Navigation (Mobile only) */}
      {isMobile && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'rgba(15,15,20,0.95)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(241,240,239,0.1)',
            zIndex: 1200,
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            value={activeIndex}
            onChange={(_, val) => navigate(NAV_ITEMS[val].path)}
            sx={{
              bgcolor: 'transparent',
              height: 64,
              '& .MuiBottomNavigationAction-root': {
                color: 'text.secondary',
                minWidth: 60,
                '&.Mui-selected': { color: 'primary.main' },
              },
            }}
          >
            {NAV_ITEMS.map(item => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
                sx={{ fontSize: '0.65rem' }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
