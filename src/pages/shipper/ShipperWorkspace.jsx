import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid,
  Chip, CircularProgress, Alert, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import DirectionsBikeRoundedIcon    from '@mui/icons-material/DirectionsBikeRounded';
import PauseCircleFilledRoundedIcon from '@mui/icons-material/PauseCircleFilledRounded';
import CheckCircleRoundedIcon       from '@mui/icons-material/CheckCircleRounded';
import PhotoCameraRoundedIcon       from '@mui/icons-material/PhotoCameraRounded';
import CloseRoundedIcon             from '@mui/icons-material/CloseRounded';
import FiberManualRecordIcon        from '@mui/icons-material/FiberManualRecord';
import LocationOnRoundedIcon        from '@mui/icons-material/LocationOnRounded';
import LocalShippingRoundedIcon     from '@mui/icons-material/LocalShippingRounded';
import NoteAltRoundedIcon           from '@mui/icons-material/NoteAltRounded';
import LocalTaxiRoundedIcon         from '@mui/icons-material/LocalTaxiRounded';
import { supabase }                 from '../../supabaseClient.js';
import { useAuth }                  from '../../contexts/AuthContext.jsx';

/* ── Status config ─────────────────────────────────────────── */
const STATUS_CONFIG = {
  OFFLINE:    { label: 'Ngoại tuyến', color: '#a09d9a', bg: 'rgba(160,157,154,0.12)' },
  IDLE:       { label: 'Sẵn sàng',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  PICKING_UP: { label: 'Đang đón',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  DELIVERING: { label: 'Đang giao',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const formatVND = (v) => v != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '';

/* ── Lấy vị trí GPS hiện tại (Promise) ─────────────────────── */
function getCurrentGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Thiết bị không hỗ trợ GPS'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(new Error('Không lấy được vị trí GPS: ' + err.message)),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

export default function ShipperWorkspace() {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [orders, setOrders]           = useState([]);
  const [error, setError]             = useState('');
  const [gpsStatus, setGpsStatus]     = useState('idle'); // idle | tracking | denied

  // Upload State
  const [uploadingOrder, setUploadingOrder]   = useState(null);
  const [uploadLoading, setUploadLoading]     = useState(false);

  // Check-in state
  const [checkingInOrder, setCheckingInOrder] = useState(null); // đơn đang check-in
  const [checkInType, setCheckInType]         = useState(''); // 'pickup' | 'delivery'
  const [checkInLoading, setCheckInLoading]   = useState(false);
  const [checkInSuccess, setCheckInSuccess]   = useState('');

  const fileInputRef  = useRef(null);
  const gpsWatchRef   = useRef(null);
  const driverInfoRef = useRef(null);

  // Sync driverInfo vào ref để dùng trong geolocation callback
  useEffect(() => { driverInfoRef.current = driverInfo; }, [driverInfo]);

  /* ── Load Initial Data ───────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: driver, error: driverErr } = await supabase
      .from('drivers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (driverErr) {
      setError('Lỗi tải thông tin tài xế: ' + driverErr.message);
      setLoading(false);
      return;
    }
    setDriverInfo(driver);

    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .or(`status.eq.PENDING,driver_id.eq.${driver.id}`)
      .order('created_at', { ascending: false });

    if (orderErr) {
      setError('Lỗi tải đơn hàng: ' + orderErr.message);
    } else {
      const activeOrders = orderData.filter(o =>
        o.status !== 'COMPLETED' || (o.status === 'COMPLETED' && new Date(o.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000)
      );
      setOrders(activeOrders);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Realtime Subscriptions ─────────────────────────────── */
  useEffect(() => {
    if (!user || !driverInfo) return;

    const ordersChannel = supabase
      .channel('shipper-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData())
      .subscribe();

    const driverChannel = supabase
      .channel('shipper-self-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverInfo.id}` }, (payload) => {
        setDriverInfo(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(driverChannel);
    };
  }, [user, driverInfo?.id, loadData]);

  /* ── GPS Tracking liên tục ──────────────────────────────── */
  useEffect(() => {
    if (!driverInfo) return;

    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }

    if (!['IDLE', 'PICKING_UP', 'DELIVERING'].includes(driverInfo.status)) {
      setGpsStatus('idle');
      return;
    }

    if (!navigator.geolocation) { setGpsStatus('denied'); return; }

    setGpsStatus('tracking');
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const driver = driverInfoRef.current;
        if (!driver) return;
        await supabase.from('drivers').update({
          latitude, longitude, updated_at: new Date().toISOString()
        }).eq('id', driver.id);
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
    };
  }, [driverInfo?.status]);

  /* ── Actions ─────────────────────────────────────────────── */
  const handleStatusChange = async (newStatus) => {
    if (!driverInfo) return;

    // 🔒 Bảo mật: Không cho OFFLINE khi đang có đơn
    if (newStatus === 'OFFLINE') {
      const hasActiveOrder = orders.some(
        o => o.driver_id === driverInfo.id && ['ACCEPTED', 'DELIVERING'].includes(o.status)
      );
      if (hasActiveOrder) {
        setError('Không thể chuyển sang Ngoại tuyến khi đang có đơn đang xử lý. Vui lòng hoàn tất đơn trước.');
        return;
      }
    }

    const { error: err } = await supabase
      .from('drivers')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', driverInfo.id);
    if (err) setError(err.message);
  };

  const handleAcceptOrder = async (orderId) => {
    if (!driverInfo) return;

    // 🔒 Bảo mật: Chỉ nhận đơn PENDING chưa có tài xế
    const { error: err } = await supabase
      .from('orders')
      .update({ status: 'ACCEPTED', driver_id: driverInfo.id })
      .eq('id', orderId)
      .eq('status', 'PENDING')
      .is('driver_id', null);

    if (err) setError('Không thể nhận đơn: ' + err.message);
    else await handleStatusChange('PICKING_UP');
  };

  /* ── Check-in Điểm ĐÓN: shipper đã đến điểm đón ────────── */
  const handlePickupCheckin = async (order) => {
    setCheckingInOrder(order);
    setCheckInType('pickup');
    setCheckInLoading(true);
    setCheckInSuccess('');
    try {
      const gps = await getCurrentGPS();

      // Update đơn: lưu GPS check-in điểm đón + chuyển sang DELIVERING
      const { error: orderErr } = await supabase
        .from('orders')
        .update({
          pickup_checkin_lat: gps.lat,
          pickup_checkin_lng: gps.lng,
          pickup_checkin_at:  new Date().toISOString(),
          status:             'DELIVERING',
        })
        .eq('id', order.id)
        .eq('driver_id', driverInfo.id)  // 🔒 Chỉ đơn của mình
        .eq('status', 'ACCEPTED');        // 🔒 Phải ở trạng thái ACCEPTED

      if (orderErr) throw orderErr;

      // Cập nhật trạng thái tài xế thành DELIVERING
      await supabase.from('drivers').update({ status: 'DELIVERING', updated_at: new Date().toISOString() }).eq('id', driverInfo.id);

      setCheckInSuccess(`✅ Check-in điểm đón thành công!\n📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`);
      await loadData();
    } catch (err) {
      setError('Check-in thất bại: ' + err.message);
      setCheckingInOrder(null);
    } finally {
      setCheckInLoading(false);
    }
  };

  /* ── Check-in GIAO HÀNG: shipper đã giao, upload ảnh ──── */
  const handleDeliveryCheckinClick = (order) => {
    setUploadingOrder(order);
    setCheckInType('delivery');
    setCheckInSuccess('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingOrder) return;

    // 🔒 Validate file
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Chỉ được phép tải lên file ảnh (JPG, PNG, WebP, HEIC). File không hợp lệ: ' + file.type);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File ảnh không được vượt quá 10MB.');
      return;
    }

    setUploadLoading(true);
    setError('');

    try {
      // 1. Lấy GPS hiện tại
      let gps = null;
      try { gps = await getCurrentGPS(); } catch {}

      // 2. Upload ảnh
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${uploadingOrder.id}_delivery_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('proofs').getPublicUrl(fileName);

      // 3. 🔒 Update đơn với GPS + ảnh + COMPLETED
      const updatePayload = {
        status:               'COMPLETED',
        proof_image_url:      publicUrlData.publicUrl,
        delivery_checkin_at:  new Date().toISOString(),
      };
      if (gps) {
        updatePayload.delivery_checkin_lat = gps.lat;
        updatePayload.delivery_checkin_lng = gps.lng;
      }

      const { error: updateErr } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', uploadingOrder.id)
        .eq('driver_id', driverInfo.id)   // 🔒 Phải là đơn của mình
        .eq('status', 'DELIVERING');       // 🔒 Phải đang DELIVERING

      if (updateErr) throw updateErr;

      // 4. Driver về IDLE
      await handleStatusChange('IDLE');
      setUploadingOrder(null);
      await loadData();
    } catch (err) {
      setError('Lỗi hoàn tất đơn: ' + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>;
  }
  if (!driverInfo) {
    return <Alert severity="error">Tài khoản này chưa được liên kết với hồ sơ tài xế nào.</Alert>;
  }

  const myActiveOrders   = orders.filter(o => o.driver_id === driverInfo.id && o.status === 'ACCEPTED');
  const myDeliveringOrders = orders.filter(o => o.driver_id === driverInfo.id && o.status === 'DELIVERING');
  const availableOrders  = orders.filter(o => o.status === 'PENDING');
  const curCfg = STATUS_CONFIG[driverInfo.status] || STATUS_CONFIG.OFFLINE;

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Driver Status Toggle ───────────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3, border: `1px solid ${curCfg.color}44`, bgcolor: 'rgba(26,26,36,0.6)' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>Trạng thái hiện tại</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={gpsStatus === 'tracking' ? '📡 GPS' : gpsStatus === 'denied' ? '⚠️ GPS tắt' : '⚫ GPS'}
                size="small"
                sx={{
                  fontSize: '0.62rem', height: 20, fontWeight: 700,
                  bgcolor: gpsStatus === 'tracking' ? 'rgba(74,222,128,0.15)' : gpsStatus === 'denied' ? 'rgba(248,113,113,0.15)' : 'rgba(160,157,154,0.1)',
                  color: gpsStatus === 'tracking' ? '#4ade80' : gpsStatus === 'denied' ? '#f87171' : '#a09d9a',
                  ...(gpsStatus === 'tracking' && { animation: 'gpsPulse 2s ease-in-out infinite', '@keyframes gpsPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } } }),
                }}
              />
              <Chip
                icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important', color: `${curCfg.color} !important` }} />}
                label={curCfg.label}
                sx={{ bgcolor: curCfg.bg, color: curCfg.color, fontWeight: 700, border: `1px solid ${curCfg.color}33` }}
              />
            </Box>
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Button fullWidth variant={driverInfo.status === 'OFFLINE' ? 'contained' : 'outlined'}
                onClick={() => handleStatusChange('OFFLINE')}
                sx={{ py: 1.5, bgcolor: driverInfo.status === 'OFFLINE' ? '#5a5855' : 'transparent', color: driverInfo.status === 'OFFLINE' ? '#f1f0ef' : '#a09d9a', borderColor: '#5a5855' }}>
                Nghỉ
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button fullWidth variant={driverInfo.status === 'IDLE' ? 'contained' : 'outlined'}
                onClick={() => handleStatusChange('IDLE')}
                sx={{ py: 1.5, bgcolor: driverInfo.status === 'IDLE' ? '#4ade80' : 'transparent', color: driverInfo.status === 'IDLE' ? '#052e16' : '#4ade80', borderColor: '#4ade80' }}>
                Sẵn sàng
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Đơn đang đón (ACCEPTED → chờ check-in điểm đón) ─ */}
      {myActiveOrders.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={1.5}>
            🏍 Đang Đến Điểm Đón
          </Typography>
          {myActiveOrders.map(order => (
            <Card key={order.id} variant="outlined" sx={{ mb: 2, border: '1px solid rgba(251,146,60,0.4)', bgcolor: 'rgba(251,146,60,0.04)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header: giá + dịch vụ */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body1" fontWeight={800} color="primary.main">{formatVND(order.price)}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {order.service_name && (
                      <Chip icon={<LocalTaxiRoundedIcon sx={{ fontSize: '12px !important' }} />} label={order.service_name} size="small"
                        sx={{ fontSize: '0.62rem', height: 20, bgcolor: 'rgba(245,158,11,0.15)', color: 'primary.main', fontWeight: 600 }} />
                    )}
                    <Chip label={order.payment_method === 'CASH' ? '💵 Tiền mặt' : '🏦 CK'} size="small" sx={{ fontSize: '0.62rem', height: 20 }} />
                  </Box>
                </Box>

                {/* Ghi chú khách hàng — hiển thị nổi bật */}
                {order.notes && (
                  <Box sx={{ mb: 1.5, p: 1.2, borderRadius: 1.5, bgcolor: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                      <NoteAltRoundedIcon sx={{ fontSize: 15, color: 'secondary.main', mt: 0.1, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: 'secondary.light', lineHeight: 1.5 }}>
                        <strong>Ghi chú:</strong> {order.notes}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Typography variant="caption" color="text.disabled" display="block">📍 Điểm đón</Typography>
                <Typography variant="body2" fontWeight={600} mb={1}>{order.origin}</Typography>

                <Typography variant="caption" color="text.disabled" display="block">🏁 Điểm đến</Typography>
                <Typography variant="body2" fontWeight={600} mb={1}>{order.destination}</Typography>

                <Typography variant="caption" color="text.disabled" display="block">📞 SĐT khách</Typography>
                <Typography variant="body2" fontWeight={700} color="secondary.main" mb={2}>{order.customer_phone}</Typography>

                {/* Nút CHECK-IN Điểm Đón */}
                <Button
                  fullWidth variant="contained"
                  onClick={() => handlePickupCheckin(order)}
                  disabled={checkInLoading && checkingInOrder?.id === order.id}
                  startIcon={checkInLoading && checkingInOrder?.id === order.id
                    ? <CircularProgress size={18} color="inherit" />
                    : <LocationOnRoundedIcon />
                  }
                  sx={{ bgcolor: '#fb923c', color: '#fff', fontWeight: 700, py: 1.2, '&:hover': { bgcolor: '#ea7a20' } }}
                >
                  {checkInLoading && checkingInOrder?.id === order.id ? 'Đang lấy GPS...' : '📍 Check-in Tại Điểm Đón'}
                </Button>
                {checkInSuccess && checkingInOrder?.id === order.id && (
                  <Alert severity="success" sx={{ mt: 1 }} icon={false}>{checkInSuccess}</Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Đơn đang giao (DELIVERING → check-in điểm giao) ─ */}
      {myDeliveringOrders.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} color="#f87171" mb={1.5}>
            🚚 Đang Giao Hàng
          </Typography>
          {myDeliveringOrders.map(order => (
            <Card key={order.id} variant="outlined" sx={{ mb: 2, border: '1px solid rgba(248,113,113,0.4)', bgcolor: 'rgba(248,113,113,0.04)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body1" fontWeight={800} color="primary.main">{formatVND(order.price)}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {order.service_name && (
                      <Chip icon={<LocalTaxiRoundedIcon sx={{ fontSize: '12px !important' }} />} label={order.service_name} size="small"
                        sx={{ fontSize: '0.62rem', height: 20, bgcolor: 'rgba(245,158,11,0.15)', color: 'primary.main', fontWeight: 600 }} />
                    )}
                    <Chip label={order.payment_method === 'CASH' ? '💵 Tiền mặt' : '🏦 CK'} size="small" sx={{ fontSize: '0.62rem', height: 20 }} />
                  </Box>
                </Box>

                {/* Ghi chú */}
                {order.notes && (
                  <Box sx={{ mb: 1.5, p: 1.2, borderRadius: 1.5, bgcolor: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                      <NoteAltRoundedIcon sx={{ fontSize: 15, color: 'secondary.main', mt: 0.1, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: 'secondary.light', lineHeight: 1.5 }}>
                        <strong>Ghi chú:</strong> {order.notes}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Check-in điểm đón đã hoàn thành */}
                {order.pickup_checkin_lat && (
                  <Box sx={{ mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)' }}>
                    <Typography variant="caption" sx={{ color: '#4ade80', fontSize: '0.68rem' }}>
                      ✅ Check-in điểm đón: {order.pickup_checkin_lat?.toFixed(5)}, {order.pickup_checkin_lng?.toFixed(5)}
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" color="text.disabled" display="block">🏁 Giao đến</Typography>
                <Typography variant="body2" fontWeight={600} mb={1}>{order.destination}</Typography>

                <Typography variant="caption" color="text.disabled" display="block">📞 SĐT khách</Typography>
                <Typography variant="body2" fontWeight={700} color="secondary.main" mb={2}>{order.customer_phone}</Typography>

                {/* Nút CHECK-IN Giao Hàng */}
                <Button
                  fullWidth variant="contained"
                  onClick={() => handleDeliveryCheckinClick(order)}
                  startIcon={<LocalShippingRoundedIcon />}
                  sx={{ bgcolor: '#4ade80', color: '#052e16', fontWeight: 700, py: 1.2, '&:hover': { bgcolor: '#22c55e' } }}
                >
                  📸 Check-in Giao Hàng Thành Công
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Đơn chờ nhận (PENDING) ─────────────────────────── */}
      <Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
          Đơn Chờ Nhận ({availableOrders.length})
        </Typography>
        {availableOrders.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
            <DirectionsBikeRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Chưa có đơn hàng mới</Typography>
          </Box>
        ) : (
          availableOrders.map(order => (
            <Card key={order.id} variant="outlined" sx={{ mb: 1.5, bgcolor: 'rgba(26,26,36,0.6)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight={700} color="text.primary">{formatVND(order.price)}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {order.service_name && (
                      <Chip icon={<LocalTaxiRoundedIcon sx={{ fontSize: '12px !important' }} />} label={order.service_name} size="small"
                        sx={{ fontSize: '0.62rem', height: 20, bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main', fontWeight: 600 }} />
                    )}
                    <Chip label={order.payment_method === 'CASH' ? '💵' : '🏦'} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                  </Box>
                </Box>

                {/* Ghi chú hiển thị trước khi nhận đơn */}
                {order.notes && (
                  <Box sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                      <NoteAltRoundedIcon sx={{ fontSize: 14, color: 'secondary.main', mt: 0.1, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: '#a5f3fc', lineHeight: 1.5 }}>
                        {order.notes}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary" noWrap><strong>Từ:</strong> {order.origin}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap mb={1.5}><strong>Đến:</strong> {order.destination}</Typography>

                <Button
                  fullWidth variant="outlined"
                  onClick={() => handleAcceptOrder(order.id)}
                  disabled={driverInfo.status === 'OFFLINE' || myActiveOrders.length > 0 || myDeliveringOrders.length > 0}
                  sx={{ color: 'primary.main', borderColor: 'primary.main', '&:disabled': { borderColor: 'rgba(241,240,239,0.1)', color: 'text.disabled' } }}
                >
                  {driverInfo.status === 'OFFLINE' ? 'Cần bật Sẵn sàng để nhận' : '✋ Nhận Đơn'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* ── Dialog Upload Ảnh Check-in Giao Hàng ────────────── */}
      <Dialog open={!!uploadingOrder} onClose={() => !uploadLoading && setUploadingOrder(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhotoCameraRoundedIcon sx={{ color: '#4ade80' }} />
            Check-in Giao Hàng Thành Công
          </Box>
          <IconButton onClick={() => setUploadingOrder(null)} disabled={uploadLoading}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {uploadingOrder && (
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Typography variant="caption" color="text.secondary" display="block">🏁 Giao đến:</Typography>
              <Typography variant="body2" fontWeight={600}>{uploadingOrder.destination}</Typography>
              {uploadingOrder.notes && (
                <>
                  <Divider sx={{ my: 1, borderColor: 'rgba(241,240,239,0.08)' }} />
                  <Typography variant="caption" color="text.secondary" display="block">📝 Ghi chú:</Typography>
                  <Typography variant="body2" sx={{ color: 'secondary.light' }}>{uploadingOrder.notes}</Typography>
                </>
              )}
            </Box>
          )}
          <Typography variant="body2" mb={2} color="text.secondary">
            📸 Chụp ảnh bằng chứng giao hàng. Vị trí GPS sẽ được ghi lại tự động.
          </Typography>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            fullWidth variant="contained"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
            startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraRoundedIcon />}
            sx={{ py: 2, bgcolor: '#4ade80', color: '#052e16', fontWeight: 700, '&:hover': { bgcolor: '#22c55e' } }}
          >
            {uploadLoading ? 'Đang xử lý...' : '📸 Chụp / Chọn Ảnh Xác Nhận Giao Hàng'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Dialog Check-in điểm đón thành công */}
      <Dialog open={!!checkInSuccess && !checkingInOrder?.id} onClose={() => setCheckInSuccess('')} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 64, color: '#4ade80', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} mb={1}>Check-in thành công!</Typography>
          <Typography variant="body2" color="text.secondary">{checkInSuccess}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckInSuccess('')} fullWidth sx={{ color: '#4ade80' }}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
