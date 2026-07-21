import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment, IconButton, Divider,
} from '@mui/material';
import EmailRoundedIcon         from '@mui/icons-material/EmailRounded';
import LockRoundedIcon          from '@mui/icons-material/LockRounded';
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded';
import PhoneRoundedIcon         from '@mui/icons-material/PhoneRounded';
import VisibilityRoundedIcon    from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ArrowBackRoundedIcon     from '@mui/icons-material/ArrowBackRounded';
import { supabase }             from '../supabaseClient.js';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName,  setFullName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (password.length < 6)  { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (!phone.trim())        { setError('Vui lòng nhập số điện thoại.'); return; }

    setLoading(true);
    try {
      // 1. Tạo tài khoản Supabase Auth
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });
      if (signUpErr) throw signUpErr;
      if (!data.user) throw new Error('Không tạo được tài khoản.');

      // 2. Insert role CUSTOMER
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert([{ auth_user_id: data.user.id, role: 'CUSTOMER' }]);
      if (roleErr) throw roleErr;

      setSuccess('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => navigate('/customer/home', { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.07) 0%, transparent 60%), #0f0f14',
        p: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 440,
          border: '1px solid rgba(6,182,212,0.2)',
          background: 'rgba(26,26,36,0.92)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, justifyContent: 'center' }}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: 2,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(245,158,11,0.4)', overflow: 'hidden',
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
              <Typography variant="caption" color="text.secondary">Tạo tài khoản mới</Typography>
            </Box>
          </Box>

          <Typography variant="h6" fontWeight={700} mb={0.5} textAlign="center">Đăng Ký</Typography>
          <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
            Đặt dịch vụ nhanh chóng, tiện lợi
          </Typography>

          {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Họ và tên" fullWidth required
              value={fullName} onChange={e => setFullName(e.target.value)}
              autoComplete="name"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
            />
            <TextField
              label="Số điện thoại" fullWidth required
              value={phone} onChange={e => setPhone(e.target.value)}
              autoComplete="tel" inputMode="tel"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><PhoneRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
            />
            <TextField
              label="Email" type="email" fullWidth required
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
            />
            <TextField
              label="Mật khẩu" type={showPwd ? 'text' : 'password'} fullWidth required
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              helperText="Ít nhất 6 ký tự"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><LockRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
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
            <TextField
              label="Xác nhận mật khẩu" type={showPwd ? 'text' : 'password'} fullWidth required
              value={confirm} onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> } }}
            />

            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={loading}
              sx={{
                mt: 1, py: 1.4, fontSize: '1rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                boxShadow: '0 4px 20px rgba(6,182,212,0.3)',
                '&:hover': { boxShadow: '0 6px 24px rgba(6,182,212,0.45)' },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Tạo Tài Khoản'}
            </Button>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'rgba(241,240,239,0.08)' }}>
            <Typography variant="caption" color="text.disabled">đã có tài khoản?</Typography>
          </Divider>

          <Button
            component={Link} to="/login" variant="outlined" fullWidth
            startIcon={<ArrowBackRoundedIcon />}
            sx={{
              py: 1.2, fontWeight: 600,
              borderColor: 'rgba(245,158,11,0.35)', color: 'primary.main',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(245,158,11,0.06)' },
            }}
          >
            Quay lại Đăng nhập
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
