import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress,
  Alert, Divider,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import LocationOnRoundedIcon  from '@mui/icons-material/LocationOnRounded';
import PaymentsRoundedIcon    from '@mui/icons-material/PaymentsRounded';
import { supabase }           from '../../supabaseClient.js';
import { formatVND, formatDateTime } from '../../utils/shared.jsx';
import { useAuth }            from '../../contexts/AuthContext.jsx';

const ORDER_STATUS = {
  PENDING:   { label: 'Đang chờ shipper',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  emoji: '⏳' },
  ACCEPTED:  { label: 'Shipper đã nhận',   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   emoji: '🏍' },
  COMPLETED: { label: 'Hoàn tất',          color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  emoji: '✅' },
};

function StatusChip({ status }) {
  const cfg = ORDER_STATUS[status] || ORDER_STATUS.PENDING;
  return (
    <Chip
      icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: `${cfg.color} !important` }} />}
      label={`${cfg.emoji} ${cfg.label}`}
      size="small"
      sx={{
        fontWeight: 700, fontSize: '0.72rem',
        bgcolor: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.color}33`,
      }}
    />
  );
}

export default function CustomerMyOrdersPage() {
  const { user }            = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, drivers(full_name, phone_number)')
      .eq('customer_user_id', user.id)
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setOrders(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* Realtime subscription */
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('customer-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchOrders]);

  return (
    <Box
      className="page-enter"
      sx={{
        minHeight: 'calc(100vh - 56px)',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 3 },
        maxWidth: 700,
        mx: 'auto',
      }}
    >
      <Typography variant="h6" fontWeight={800} mb={0.5}>Đơn hàng của tôi</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Theo dõi trạng thái đơn hàng thời gian thực
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <LocalShippingRoundedIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
            Bạn chưa có đơn hàng nào
          </Typography>
          <Typography variant="body2" color="text.disabled" mt={0.5}>
            Hãy đặt dịch vụ đầu tiên của bạn!
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {orders.map(order => {
            const cfg = ORDER_STATUS[order.status] || ORDER_STATUS.PENDING;
            return (
              <Card
                key={order.id}
                variant="outlined"
                sx={{
                  border: `1px solid ${cfg.color}33`,
                  background: `linear-gradient(135deg, ${cfg.bg}, transparent 80%)`,
                  transition: 'transform 0.15s',
                  '&:hover': { transform: 'translateY(-1px)' },
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      {order.service_name && (
                        <Chip
                          label={order.service_name}
                          size="small"
                          sx={{
                            mb: 0.75, fontSize: '0.68rem', height: 20,
                            bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main', fontWeight: 700,
                          }}
                        />
                      )}
                      <Typography variant="caption" color="text.disabled" display="block">
                        {formatDateTime(order.created_at)}
                      </Typography>
                    </Box>
                    <StatusChip status={order.status} />
                  </Box>

                  {/* Địa chỉ */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <LocationOnRoundedIcon sx={{ color: '#fb923c', fontSize: 16, mt: '2px', flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{order.origin}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <LocationOnRoundedIcon sx={{ color: '#4ade80', fontSize: 16, mt: '2px', flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{order.destination}</Typography>
                    </Box>
                  </Box>

                  {order.notes && (
                    <Box sx={{ mt: 1.5, p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(241,240,239,0.06)' }}>
                      <Typography variant="caption" color="text.disabled">📝 {order.notes}</Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(241,240,239,0.08)' }} />

                  {/* Footer */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <PaymentsRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#fcd34d' }}>
                        {formatVND(order.price)}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        · {order.payment_method === 'CASH' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}
                      </Typography>
                    </Box>

                    {/* Shipper info */}
                    {order.drivers && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box
                          sx={{
                            px: 1.5, py: 0.4, borderRadius: 2,
                            bgcolor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)',
                          }}
                        >
                          <Typography variant="caption" color="secondary.main" fontWeight={700}>
                            🏍 {order.drivers.full_name}
                          </Typography>
                          {order.drivers.phone_number && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                              {order.drivers.phone_number}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
