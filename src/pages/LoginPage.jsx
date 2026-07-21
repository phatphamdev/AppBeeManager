import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, role, loading: authLoading } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  /* ── Redirect nếu đã đăng nhập ─────────────────────────── */
  useEffect(() => {
    if (!authLoading && user && role) {
      const from = location.state?.from?.pathname;
      if (role === 'ADMIN')    navigate(from || '/admin/dashboard',    { replace: true });
      if (role === 'SHIPPER')  navigate(from || '/shipper/workspace',  { replace: true });
      if (role === 'CUSTOMER') navigate(from || '/customer/home',      { replace: true });
    }
  }, [user, role, authLoading, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      if (!data.user) throw new Error('Đăng nhập thất bại.');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('auth_user_id', data.user.id)
        .single();

      const userRole = roleData?.role;
      if (userRole === 'ADMIN')         navigate('/admin/dashboard',   { replace: true });
      else if (userRole === 'SHIPPER')  navigate('/shipper/workspace', { replace: true });
      else if (userRole === 'CUSTOMER') navigate('/customer/home',     { replace: true });
      else setError('Tài khoản chưa được phân quyền. Liên hệ quản trị viên.');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 60%), #0f0f14',
        p: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid rgba(245,158,11,0.2)',
          background: 'rgba(26,26,36,0.9)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(245,158,11,0.4)',
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
              <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px" lineHeight={1}>
                Bee<Box component="span" sx={{ color: 'primary.main' }}>Ship</Box>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dịch vụ giao hàng &amp; vận chuyển
              </Typography>
            </Box>
          </Box>

          <Typography variant="h6" fontWeight={700} mb={0.5} textAlign="center">
            Đăng Nhập
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
            Nhập thông tin tài khoản để tiếp tục
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="Mật khẩu"
              type={showPwd ? 'text' : 'password'}
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd(!showPwd)} edge="end">
                        {showPwd
                          ? <VisibilityOffRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          : <VisibilityRoundedIcon    sx={{ fontSize: 18, color: 'text.disabled' }} />
                        }
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                mt: 1,
                py: 1.4,
                fontSize: '1rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
                '&:hover': { boxShadow: '0 6px 24px rgba(245,158,11,0.45)' },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#1a1207' }} /> : 'Đăng Nhập'}
            </Button>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'rgba(241,240,239,0.08)' }}>
            <Typography variant="caption" color="text.disabled">hoặc</Typography>
          </Divider>

          <Button
            component={Link}
            to="/register"
            variant="outlined"
            fullWidth
            startIcon={<PersonAddRoundedIcon />}
            sx={{
              py: 1.2,
              fontWeight: 600,
              borderColor: 'rgba(6,182,212,0.35)',
              color: 'secondary.main',
              '&:hover': {
                borderColor: 'secondary.main',
                bgcolor: 'rgba(6,182,212,0.06)',
              },
            }}
          >
            Đăng ký tài khoản mới
          </Button>

          <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={2}>
            Đăng ký để đặt dịch vụ giao hàng, xe ôm, ship đồ ăn...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
