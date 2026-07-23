import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Container, Typography, Card, CardContent,
  Alert, Chip, CircularProgress, Button, Select, MenuItem,
  FormControl, InputLabel, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, Avatar, Tooltip, Divider, IconButton,
} from '@mui/material';
import AssignmentRoundedIcon      from '@mui/icons-material/AssignmentRounded';
import QrCodeRoundedIcon          from '@mui/icons-material/QrCodeRounded';
import FiberManualRecordIcon      from '@mui/icons-material/FiberManualRecord';
import PersonPinRoundedIcon       from '@mui/icons-material/PersonPinRounded';
import BroadcastOnHomeRoundedIcon from '@mui/icons-material/BroadcastOnHomeRounded';
import NearMeRoundedIcon          from '@mui/icons-material/NearMeRounded';
import CloseRoundedIcon           from '@mui/icons-material/CloseRounded';
import LocationOnRoundedIcon      from '@mui/icons-material/LocationOnRounded';
import FlagRoundedIcon            from '@mui/icons-material/FlagRounded';
import PhoneRoundedIcon           from '@mui/icons-material/PhoneRounded';
import PersonRoundedIcon          from '@mui/icons-material/PersonRounded';
import DataGrid, {
  Column, Sorting, FilterRow, Pager, Paging,
} from 'devextreme-react/data-grid';
import { supabase }           from '../../supabaseClient.js';
import { VietQRDialog }       from '../../components/VietQR.jsx';
import { gridSx, formatVND, formatDateTime } from '../../utils/shared.jsx';

/* ── Haversine distance (km) ─────────────────────── */
function haversine(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/* ── Status config ─────────────────────────────────────────── */
const ORDER_STATUS = {
  PENDING:    { label: 'Chờ nhận',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  ACCEPTED:   { label: 'Đã nhận',     color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'  },
  DELIVERING: { label: 'Đang giao',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  COMPLETED:  { label: 'Hoàn tất',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
};

function OrderStatusChip({ value }) {
  const cfg = ORDER_STATUS[value] || ORDER_STATUS.PENDING;
  return (
    <Chip icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: `${cfg.color} !important` }} />}
      label={cfg.label} size="small"
      sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
    />
  );
}

function CurrencyCell({ value }) {
  return <span style={{ color: '#fcd34d', fontWeight: 600 }}>{formatVND(value)}</span>;
}

/* ══════════════════════════════════════════════════
   Dialog Chi Tiết Đơn
══════════════════════════════════════════════════ */
function OrderDetailDialog({ order, open, onClose, onDispatch, onQR }) {
  if (!order) return null;

  const statusCfg = ORDER_STATUS[order.status] || ORDER_STATUS.PENDING;

  const InfoRow = ({ icon, label, value, valueColor }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1, borderBottom: '1px solid rgba(241,240,239,0.06)' }}>
      <Box sx={{ color: '#a09d9a', mt: 0.2, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.disabled" display="block" lineHeight={1.2}>{label}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ color: valueColor || 'text.primary', mt: 0.3 }}>
          {value || <span style={{ color: '#5a5855', fontStyle: 'italic' }}>Không có</span>}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(245,158,11,0.2)' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentRoundedIcon sx={{ color: 'secondary.main' }} />
          <Typography fontWeight={700}>Chi tiết đơn hàng</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <OrderStatusChip value={order.status} />
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* ID + Dịch vụ */}
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography variant="caption" color="text.disabled">Mã đơn</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
              {order.id?.slice(0, 16)}...
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            {order.service_name && (
              <Chip label={order.service_name} size="small"
                sx={{ fontSize: '0.68rem', bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main', fontWeight: 700 }} />
            )}
            <Typography variant="caption" color="text.disabled" display="block" mt={0.3}>
              {formatDateTime(order.created_at)}
            </Typography>
          </Box>
        </Box>

        {/* Thông tin khách hàng */}
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={0.5} textTransform="uppercase" fontSize="0.68rem" letterSpacing={1}>
          Khách hàng
        </Typography>
        <InfoRow
          icon={<PersonRoundedIcon sx={{ fontSize: 18 }} />}
          label="Tên khách hàng"
          value={order.customer_name}
        />
        <InfoRow
          icon={<PhoneRoundedIcon sx={{ fontSize: 18 }} />}
          label="Số điện thoại"
          value={order.customer_phone}
          valueColor="#06b6d4"
        />

        {/* Địa chỉ */}
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mt={1.5} mb={0.5} textTransform="uppercase" fontSize="0.68rem" letterSpacing={1}>
          Địa chỉ
        </Typography>
        <InfoRow
          icon={<LocationOnRoundedIcon sx={{ fontSize: 18, color: '#fb923c' }} />}
          label="Điểm đón"
          value={order.origin}
        />
        {order.pickup_checkin_lat && (
          <Box sx={{ pl: 4.5, pb: 1 }}>
            <Box component="a"
              href={`https://www.google.com/maps?q=${order.pickup_checkin_lat},${order.pickup_checkin_lng}`}
              target="_blank" rel="noopener noreferrer"
              sx={{ color: '#fb923c', fontSize: '0.75rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              📍 GPS Check-in: {Number(order.pickup_checkin_lat).toFixed(4)}, {Number(order.pickup_checkin_lng).toFixed(4)}
            </Box>
          </Box>
        )}
        <InfoRow
          icon={<FlagRoundedIcon sx={{ fontSize: 18, color: '#4ade80' }} />}
          label="Điểm đến"
          value={order.destination}
        />
        {order.delivery_checkin_lat && (
          <Box sx={{ pl: 4.5, pb: 1 }}>
            <Box component="a"
              href={`https://www.google.com/maps?q=${order.delivery_checkin_lat},${order.delivery_checkin_lng}`}
              target="_blank" rel="noopener noreferrer"
              sx={{ color: '#4ade80', fontSize: '0.75rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              🏁 GPS Check-in: {Number(order.delivery_checkin_lat).toFixed(4)}, {Number(order.delivery_checkin_lng).toFixed(4)}
            </Box>
          </Box>
        )}

        {/* Ghi chú */}
        {order.notes && (
          <>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mt={1.5} mb={0.5} textTransform="uppercase" fontSize="0.68rem" letterSpacing={1}>
              Ghi chú
            </Typography>
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(165,243,252,0.05)', border: '1px solid rgba(165,243,252,0.12)' }}>
              <Typography variant="body2" sx={{ color: '#a5f3fc' }}>📝 {order.notes}</Typography>
            </Box>
          </>
        )}

        {/* Thanh toán */}
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mt={1.5} mb={0.5} textTransform="uppercase" fontSize="0.68rem" letterSpacing={1}>
          Thanh toán
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {formatVND(order.price)}
          </Typography>
          <Chip
            label={order.payment_method === 'CASH' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}
            size="small" sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          />
        </Box>

        {/* Ảnh giao hàng */}
        {order.proof_image_url && (
          <>
            <Divider sx={{ my: 1.5, borderColor: 'rgba(241,240,239,0.08)' }} />
            <Box component="a" href={order.proof_image_url} target="_blank"
              sx={{ color: 'secondary.main', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              📷 Xem ảnh giao hàng →
            </Box>
          </>
        )}

        {/* Tài xế */}
        <Divider sx={{ my: 1.5, borderColor: 'rgba(241,240,239,0.08)' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(245,158,11,0.15)', color: 'primary.main', fontSize: '0.8rem' }}>
            {order.drivers?.full_name?.[0] || '?'}
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.disabled">Tài xế phụ trách</Typography>
            <Typography variant="body2" fontWeight={700}>
              {order.drivers?.full_name || <span style={{ color: '#5a5855', fontStyle: 'italic' }}>Chưa gán tài xế</span>}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {order.payment_method === 'TRANSFER' && order.status !== 'COMPLETED' && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<QrCodeRoundedIcon />}
            onClick={() => { onClose(); onQR(order); }}
            sx={{ color: 'secondary.main', borderColor: 'rgba(6,182,212,0.3)', fontSize: '0.78rem' }}
          >
            VietQR
          </Button>
        )}
        {order.status === 'PENDING' && (
          <Button
            variant="contained"
            size="small"
            startIcon={<PersonPinRoundedIcon />}
            onClick={() => { onClose(); onDispatch(order); }}
            sx={{
              bgcolor: 'rgba(251,146,60,0.15)', color: '#fb923c',
              border: '1px solid rgba(251,146,60,0.4)',
              fontWeight: 700, fontSize: '0.78rem',
              '&:hover': { bgcolor: 'rgba(251,146,60,0.25)' },
              boxShadow: 'none',
            }}
          >
            Phân đơn
          </Button>
        )}
        <Button onClick={onClose} sx={{ color: 'text.secondary', ml: 'auto' }}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════
   Dialog Phân Đơn
══════════════════════════════════════════════════ */
function DispatchDialog({ order, open, onClose, onDispatched }) {
  const [drivers, setDrivers]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('drivers')
      .select('*')
      .neq('status', 'OFFLINE')
      .then(({ data }) => {
        // Gắn khoảng cách nếu đơn có tọa độ
        const enriched = (data || []).map(d => {
          const dist = (order.origin_lat && d.latitude)
            ? haversine(order.origin_lat, order.origin_lng, d.latitude, d.longitude)
            : null;
          return { ...d, distKm: dist };
        });
        // Sort: có GPS gần nhất lên đầu, không có GPS xuống cuối
        enriched.sort((a, b) => {
          if (a.distKm !== null && b.distKm !== null) return a.distKm - b.distKm;
          if (a.distKm !== null) return -1;
          if (b.distKm !== null) return 1;
          return 0;
        });
        setDrivers(enriched);
        setLoading(false);
      });
  }, [open, order]);

  const dispatch = async (driverId) => {
    setDispatching(true);
    setError('');
    try {
      // Cập nhật đơn
      const { error: oErr } = await supabase
        .from('orders')
        .update({
          driver_id: driverId || null,
          status:    driverId ? 'ACCEPTED' : 'PENDING',
        })
        .eq('id', order.id);
      if (oErr) throw oErr;

      // Nếu gán tài xế, update status tài xế
      if (driverId) {
        await supabase
          .from('drivers')
          .update({ status: 'PICKING_UP' })
          .eq('id', driverId);
      }

      onDispatched();
      onClose();
    } catch (e) {
      setError(e.message || 'Lỗi phân đơn');
    } finally {
      setDispatching(false);
    }
  };

  const DRIVER_STATUS_LABEL = {
    IDLE:       { label: 'Sẵn sàng',  color: '#4ade80' },
    PICKING_UP: { label: 'Đang đón',  color: '#fb923c' },
    DELIVERING: { label: 'Đang giao', color: '#f87171' },
    OFFLINE:    { label: 'Ngoại tuyến', color: '#a09d9a' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(245,158,11,0.2)' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonPinRoundedIcon sx={{ color: 'primary.main' }} />
        Phân đơn cho Shipper
      </DialogTitle>
      <DialogContent>
        {/* Thông tin đơn */}
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', mb: 2 }}>
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>Đơn hàng</Typography>
          {order.service_name && (
            <Chip label={order.service_name} size="small"
              sx={{ mb: 0.75, fontSize: '0.68rem', bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main', fontWeight: 700 }} />
          )}
          {order.customer_name && (
            <Typography variant="body2" fontWeight={700}>{order.customer_name}</Typography>
          )}
          <Typography variant="body2" fontWeight={600} color="secondary.main">{order.customer_phone}</Typography>
          <Typography variant="caption" color="text.secondary">📍 {order.origin}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">🏁 {order.destination}</Typography>
          <Typography variant="body2" fontWeight={700} color="primary.main" mt={0.5}>{formatVND(order.price)}</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Chọn shipper:</Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Broadcast option */}
            <Card
              variant="outlined"
              sx={{
                border: '1px solid rgba(6,182,212,0.3)',
                background: 'rgba(6,182,212,0.05)',
                cursor: 'pointer',
                '&:hover': { background: 'rgba(6,182,212,0.1)' },
              }}
              onClick={() => dispatch(null)}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <BroadcastOnHomeRoundedIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="secondary.main">
                    📡 Broadcast — Tất cả shipper
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Gửi đến tất cả shipper, ai nhận trước được việc
                  </Typography>
                </Box>
                {dispatching && <CircularProgress size={18} />}
              </CardContent>
            </Card>

            {drivers.length === 0 && (
              <Alert severity="warning" variant="outlined">Không có shipper nào đang hoạt động.</Alert>
            )}

            {/* Shipper list */}
            {drivers.map((d, idx) => {
              const stCfg = DRIVER_STATUS_LABEL[d.status] || DRIVER_STATUS_LABEL.OFFLINE;
              return (
                <Card
                  key={d.id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    border: idx === 0 && d.distKm !== null
                      ? '1px solid rgba(74,222,128,0.4)'
                      : '1px solid rgba(241,240,239,0.1)',
                    background: idx === 0 && d.distKm !== null
                      ? 'rgba(74,222,128,0.05)'
                      : 'transparent',
                    transition: 'all 0.15s',
                    '&:hover': { background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)' },
                  }}
                  onClick={() => dispatch(d.id)}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(245,158,11,0.15)', color: 'primary.main', fontSize: '0.85rem' }}>
                      {d.full_name?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>{d.full_name}</Typography>
                        {idx === 0 && d.distKm !== null && (
                          <Chip label="🏆 Gần nhất" size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(74,222,128,0.15)', color: '#4ade80', fontWeight: 700 }} />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">{d.phone_number}</Typography>
                        <Chip
                          label={stCfg.label} size="small"
                          sx={{ fontSize: '0.6rem', height: 16, bgcolor: `${stCfg.color}20`, color: stCfg.color, fontWeight: 700 }}
                        />
                      </Box>
                    </Box>
                    {d.distKm !== null ? (
                      <Tooltip title="Khoảng cách từ shipper đến điểm đón">
                        <Box sx={{ textAlign: 'right' }}>
                          <NearMeRoundedIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                          <Typography variant="caption" color="secondary.main" display="block" fontWeight={700}>
                            {d.distKm.toFixed(1)} km
                          </Typography>
                        </Box>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">GPS N/A</Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════
   Main OrdersPage
══════════════════════════════════════════════════ */
export default function OrdersPage() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [qrOrder, setQrOrder]   = useState(null);
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [detailOrder, setDetailOrder]     = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('ALL');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('orders').select('*, drivers(full_name)').order('created_at', { ascending: false });
    if (err) setError(err.message); else setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Realtime subscription ─────────────────────────────────── */
  useEffect(() => {
    const channel = supabase
      .channel('orders-admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  // Derived state
  const { displayedOrders, uniqueDrivers, revenueToday } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const filtered = selectedDriverId === 'ALL' ? orders : orders.filter(o => o.driver_id === selectedDriverId);
    let revToday = 0;
    filtered.forEach(o => {
      if (o.status === 'COMPLETED' && new Date(o.created_at) >= todayStart) revToday += o.price || 0;
    });
    const dMap = new Map();
    orders.forEach(o => {
      if (o.driver_id && o.drivers) dMap.set(o.driver_id, o.drivers.full_name);
    });
    const drivers = Array.from(dMap.entries()).map(([id, name]) => ({ id, name }));
    return { displayedOrders: filtered, uniqueDrivers: drivers, revenueToday: revToday };
  }, [orders, selectedDriverId]);

  const summaryByStatus = Object.entries(ORDER_STATUS).map(([key, cfg]) => ({
    key, ...cfg, count: displayedOrders.filter(o => o.status === key).length,
  }));

  const pendingCount = displayedOrders.filter(o => o.status === 'PENDING').length;

  /* ── Grid row click style */
  const gridSxWithCursor = {
    ...gridSx,
    '& .dx-datagrid-rowsview .dx-row': {
      ...gridSx['& .dx-datagrid-rowsview .dx-row'],
      cursor: 'pointer',
    },
  };

  return (
    <Box className="page-enter" sx={{ minHeight: 'calc(100vh - 64px)', py: 3 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AssignmentRoundedIcon sx={{ color: 'secondary.main', fontSize: 18 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">Đơn Hàng</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" ml={6}>
            Theo dõi, quản lý và phân đơn cho shipper · Nhấn vào đơn để xem chi tiết
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Summary & Filter */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
              {summaryByStatus.map(s => (
                <Chip key={s.key}
                  icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: `${s.color} !important` }} />}
                  label={`${s.label}: ${s.count}`}
                  sx={{ fontWeight: 700, bgcolor: s.bg, color: s.color, border: `1px solid ${s.color}33`, px: 1 }}
                />
              ))}
              <Chip
                label={`Doanh thu hôm nay: ${formatVND(revenueToday)}`}
                sx={{ fontWeight: 800, bgcolor: 'rgba(252,211,77,0.12)', color: '#fcd34d', border: '1px solid rgba(252,211,77,0.3)', px: 1, ml: 'auto' }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Bộ lọc theo tài xế</InputLabel>
              <Select value={selectedDriverId} label="Bộ lọc theo tài xế" onChange={e => setSelectedDriverId(e.target.value)}>
                <MenuItem value="ALL">-- Tất cả tài xế --</MenuItem>
                {uniqueDrivers.map(d => (
                  <MenuItem key={d.id} value={d.id}>🏍 {d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Banner đơn PENDING cần phân */}
        {pendingCount > 0 && (
          <Alert
            severity="warning"
            variant="outlined"
            sx={{ mb: 2, borderColor: 'rgba(251,146,60,0.4)', '& .MuiAlert-message': { width: '100%' } }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" fontWeight={700}>
                ⏳ Có <Box component="span" sx={{ color: '#fb923c' }}>{pendingCount} đơn</Box> đang chờ phân shipper
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Nhấn nút "Phân đơn" ở từng đơn để giao cho shipper
              </Typography>
            </Box>
          </Alert>
        )}

        <Card variant="outlined">
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: 'primary.main' }} />
              </Box>
            ) : (
              <Box sx={gridSxWithCursor}>
                <DataGrid
                  dataSource={displayedOrders}
                  keyExpr="id"
                  showBorders={false}
                  showColumnLines={false}
                  showRowLines
                  columnAutoWidth
                  onRowClick={(e) => setDetailOrder(e.data)}
                >
                  <FilterRow visible />
                  <Sorting mode="multiple" />
                  <Paging defaultPageSize={15} />
                  <Pager showPageSizeSelector allowedPageSizes={[10,15,30]} showInfo infoText="Trang {0}/{1} ({2} đơn)" />

                  {/* Khách hàng: tên + phone */}
                  <Column
                    caption="Khách hàng"
                    minWidth={150}
                    allowSorting={false}
                    cellRender={({ data }) => (
                      <Box>
                        {data.customer_name
                          ? <Typography variant="body2" fontWeight={700} noWrap>{data.customer_name}</Typography>
                          : null
                        }
                        <Typography variant="caption" sx={{ color: '#06b6d4', display: 'block' }}>
                          📞 {data.customer_phone}
                        </Typography>
                      </Box>
                    )}
                  />

                  <Column dataField="service_name" caption="Dịch vụ" width={130}
                    cellRender={({ value }) => value
                      ? <Chip label={value} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main', fontWeight: 600 }} />
                      : <span style={{ color: '#5a5855', fontSize: '0.78rem' }}>—</span>} />

                  <Column dataField="price" caption="Cước phí" width={120} alignment="right"
                    cellRender={({ value }) => <CurrencyCell value={value} />} />

                  <Column dataField="status" caption="Trạng thái" width={130}
                    cellRender={({ value }) => <OrderStatusChip value={value} />} />

                  <Column dataField="drivers.full_name" caption="Tài xế" width={140}
                    cellRender={({ data }) => (
                      <span>{data.drivers?.full_name || <span style={{ color: '#5a5855' }}>Chưa gán</span>}</span>
                    )} />

                  {/* Nút Phân đơn — thao tác nhanh ở ngoài */}
                  <Column caption="Phân đơn" width={120} allowFiltering={false} allowSorting={false}
                    cellRender={({ data }) => data.status === 'PENDING' ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PersonPinRoundedIcon sx={{ fontSize: '14px !important' }} />}
                        onClick={(e) => { e.stopPropagation(); setDispatchOrder(data); }}
                        sx={{
                          fontSize: '0.7rem', fontWeight: 700, py: 0.25,
                          color: '#fb923c', borderColor: 'rgba(251,146,60,0.4)',
                          '&:hover': { bgcolor: 'rgba(251,146,60,0.08)' },
                        }}
                      >
                        Phân đơn
                      </Button>
                    ) : null}
                  />

                  <Column dataField="created_at" caption="Tạo lúc" width={150} dataType="datetime" format="dd/MM HH:mm" />
                </DataGrid>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Dialog Chi Tiết Đơn */}
      <OrderDetailDialog
        order={detailOrder}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        onDispatch={(o) => setDispatchOrder(o)}
        onQR={(o) => setQrOrder(o)}
      />

      {/* Dialog Phân Đơn */}
      {dispatchOrder && (
        <DispatchDialog
          order={dispatchOrder}
          open={!!dispatchOrder}
          onClose={() => setDispatchOrder(null)}
          onDispatched={fetchOrders}
        />
      )}

      {/* Dialog VietQR */}
      {qrOrder && (
        <VietQRDialog
          open={!!qrOrder}
          onClose={() => setQrOrder(null)}
          amount={qrOrder.price}
          description={`BeeShip ${qrOrder.id?.slice(0, 8)}`}
          title={`VietQR — ${qrOrder.customer_phone}`}
        />
      )}
    </Box>
  );
}
