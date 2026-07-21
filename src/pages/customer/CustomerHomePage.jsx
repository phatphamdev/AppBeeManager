import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CardActionArea,
  Grid, Chip, CircularProgress, Alert, Button,
  Skeleton,
} from '@mui/material';
import LocalShippingRoundedIcon  from '@mui/icons-material/LocalShippingRounded';
import TwoWheelerRoundedIcon     from '@mui/icons-material/TwoWheelerRounded';
import FastfoodRoundedIcon       from '@mui/icons-material/FastfoodRounded';
import DirectionsBikeRoundedIcon from '@mui/icons-material/DirectionsBikeRounded';
import CakeRoundedIcon           from '@mui/icons-material/CakeRounded';
import LocalOfferRoundedIcon     from '@mui/icons-material/LocalOfferRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import ListAltRoundedIcon        from '@mui/icons-material/ListAltRounded';
import { supabase }              from '../../supabaseClient.js';
import { formatVND }             from '../../utils/shared.jsx';
import { useAuth }               from '../../contexts/AuthContext.jsx';

/* Map icon theo tên dịch vụ */
const SERVICE_ICON_MAP = {
  'giao hàng':       <LocalShippingRoundedIcon sx={{ fontSize: 32 }} />,
  'chạy xe hộ':      <TwoWheelerRoundedIcon sx={{ fontSize: 32 }} />,
  'ship đồ ăn':      <FastfoodRoundedIcon sx={{ fontSize: 32 }} />,
  'xe ôm':           <DirectionsBikeRoundedIcon sx={{ fontSize: 32 }} />,
  'giao bánh kem':   <CakeRoundedIcon sx={{ fontSize: 32 }} />,
  'shop 15k':        <LocalOfferRoundedIcon sx={{ fontSize: 32 }} />,
};

const SERVICE_COLORS = [
  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  icon: '#f59e0b' },
  { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   icon: '#06b6d4' },
  { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)',  icon: '#4ade80' },
  { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  icon: '#fb923c' },
  { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', icon: '#a78bfa' },
  { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: '#f87171' },
];

function getServiceIcon(name = '') {
  const key = Object.keys(SERVICE_ICON_MAP).find(k => name.toLowerCase().includes(k));
  return key ? SERVICE_ICON_MAP[key] : <LocalShippingRoundedIcon sx={{ fontSize: 32 }} />;
}

export default function CustomerHomePage() {
  const navigate              = useNavigate();
  const { user }              = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: svcData, error: svcErr }, { count }] = await Promise.all([
        supabase.from('services').select('*').order('id'),
        supabase.from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('customer_user_id', user?.id)
          .in('status', ['PENDING', 'ACCEPTED']),
      ]);
      if (svcErr) setError(svcErr.message);
      else setServices(svcData || []);
      setPendingCount(count || 0);
      setLoading(false);
    }
    if (user?.id) fetchData();
  }, [user?.id]);

  return (
    <Box
      className="page-enter"
      sx={{
        minHeight: 'calc(100vh - 56px)',
        background: 'radial-gradient(ellipse at 30% 0%, rgba(245,158,11,0.06) 0%, transparent 60%)',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 3 },
        maxWidth: 700,
        mx: 'auto',
      }}
    >
      {/* Greeting */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px" mb={0.5}>
          🐝 Xin chào!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bạn cần dịch vụ gì hôm nay?
        </Typography>
      </Box>

      {/* Banner đơn đang chờ */}
      {pendingCount > 0 && (
        <Card
          variant="outlined"
          sx={{
            mb: 3, border: '1px solid rgba(6,182,212,0.3)',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.08), transparent)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/customer/orders')}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ListAltRoundedIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} color="secondary.main">
                Bạn có {pendingCount} đơn hàng đang xử lý
              </Typography>
              <Typography variant="caption" color="text.secondary">Nhấn để xem chi tiết →</Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Service Grid */}
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Chọn loại dịch vụ</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} size={{ xs: 6, sm: 4 }}>
                <Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} />
              </Grid>
            ))
          : services.map((svc, i) => {
              const col = SERVICE_COLORS[i % SERVICE_COLORS.length];
              return (
                <Grid key={svc.id} size={{ xs: 6, sm: 4 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      border: `1px solid ${col.border}`,
                      background: col.bg,
                      transition: 'transform 0.18s, box-shadow 0.18s',
                      '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${col.border}` },
                    }}
                  >
                    <CardActionArea
                      onClick={() => navigate('/customer/order', { state: { serviceId: svc.id } })}
                      sx={{ height: '100%', p: 0 }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                        <Box sx={{ color: col.icon, mb: 1 }}>{getServiceIcon(svc.name)}</Box>
                        <Typography variant="subtitle2" fontWeight={700} mb={0.5} sx={{ fontSize: '0.85rem' }}>
                          {svc.name}
                        </Typography>
                        <Chip
                          label={`Từ ${formatVND(svc.base_price)}`}
                          size="small"
                          sx={{
                            fontSize: '0.65rem', height: 18, fontWeight: 700,
                            bgcolor: `${col.icon}20`, color: col.icon,
                          }}
                        />
                        <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
                          {svc.base_km} km đầu
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
      </Grid>

      {/* CTA đặt ngay */}
      {!loading && (
        <Button
          variant="contained"
          fullWidth
          size="large"
          startIcon={<AddCircleOutlineRoundedIcon />}
          onClick={() => navigate('/customer/order')}
          sx={{
            mt: 3,
            py: 1.5,
            fontWeight: 700,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
            '&:hover': { boxShadow: '0 6px 28px rgba(245,158,11,0.45)' },
          }}
        >
          Đặt dịch vụ ngay
        </Button>
      )}

      {/* Info */}
      <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(241,240,239,0.06)' }}>
        <Typography variant="caption" color="text.disabled" display="block" textAlign="center">
          🕐 Hoạt động 24/7 &nbsp;·&nbsp; 📍 Khu vực nội thành &nbsp;·&nbsp; ⚡ Giao hàng siêu tốc
        </Typography>
      </Box>
    </Box>
  );
}
