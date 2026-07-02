import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid,
  Chip, CircularProgress, Alert, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import DirectionsBikeRoundedIcon from '@mui/icons-material/DirectionsBikeRounded';
import PauseCircleFilledRoundedIcon from '@mui/icons-material/PauseCircleFilledRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { supabase } from '../../supabaseClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

/* ── Status config ─────────────────────────────────────────── */
const STATUS_CONFIG = {
  OFFLINE:    { label: 'Ngoại tuyến', color: '#a09d9a', bg: 'rgba(160,157,154,0.12)' },
  IDLE:       { label: 'Sẵn sàng',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  PICKING_UP: { label: 'Đang đón',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  DELIVERING: { label: 'Đang giao',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const formatVND = (v) => v != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '';

export default function ShipperWorkspace() {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  
  // Upload State
  const [uploadingOrder, setUploadingOrder] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);

  /* ── Load Initial Data ───────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    // Load Driver Info
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

    // Load Orders: PENDING (all) or ACCEPTED/COMPLETED (assigned to me)
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .or(`status.eq.PENDING,driver_id.eq.${driver.id}`)
      .order('created_at', { ascending: false });
      
    if (orderErr) {
      setError('Lỗi tải đơn hàng: ' + orderErr.message);
    } else {
      // Filter out completed ones just to not clutter the view (optional)
      const activeOrders = orderData.filter(o => o.status !== 'COMPLETED' || (o.status === 'COMPLETED' && new Date(o.created_at).getTime() > Date.now() - 24*60*60*1000));
      setOrders(activeOrders);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Realtime Subscriptions ─────────────────────────────── */
  useEffect(() => {
    if (!user || !driverInfo) return;

    // Listen to orders
    const ordersChannel = supabase
      .channel('shipper-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
         loadData();
      })
      .subscribe();
      
    // Listen to driver self updates
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

  /* ── Actions ─────────────────────────────────────────────── */
  const handleStatusChange = async (newStatus) => {
    if (!driverInfo) return;
    const { error: err } = await supabase
      .from('drivers')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', driverInfo.id);
    if (err) setError(err.message);
  };

  const handleAcceptOrder = async (orderId) => {
    if (!driverInfo) return;
    const { error: err } = await supabase
      .from('orders')
      .update({ status: 'ACCEPTED', driver_id: driverInfo.id })
      .eq('id', orderId);
      
    if (err) setError('Không thể nhận đơn: ' + err.message);
    else handleStatusChange('PICKING_UP'); // Auto update driver status
  };

  const handleCompleteOrderClick = (order) => {
    setUploadingOrder(order);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingOrder) return;

    setUploadLoading(true);
    setError('');
    
    try {
      // 1. Upload to Supabase Storage (bucket: proofs)
      const fileExt = file.name.split('.').pop();
      const fileName = `${uploadingOrder.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('proofs')
        .getPublicUrl(fileName);

      // 3. Update Order
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'COMPLETED', proof_image_url: publicUrlData.publicUrl })
        .eq('id', uploadingOrder.id);
        
      if (updateErr) throw updateErr;

      // 4. Update Driver Status to IDLE
      await handleStatusChange('IDLE');
      
      setUploadingOrder(null);
    } catch (err) {
      setError('Lỗi upload: ' + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>;
  }

  if (!driverInfo) {
    return <Alert severity="error">Tài khoản này chưa được liên kết với hồ sơ tài xế nào.</Alert>;
  }

  const myActiveOrders = orders.filter(o => o.driver_id === driverInfo.id && o.status === 'ACCEPTED');
  const availableOrders = orders.filter(o => o.status === 'PENDING');
  
  const curCfg = STATUS_CONFIG[driverInfo.status] || STATUS_CONFIG.OFFLINE;

  return (
    <Box className="page-enter">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Driver Status Toggle */}
      <Card variant="outlined" sx={{ mb: 3, border: `1px solid ${curCfg.color}44`, bgcolor: 'rgba(26,26,36,0.6)' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>Trạng thái hiện tại</Typography>
            <Chip 
              icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important', color: `${curCfg.color} !important` }} />} 
              label={curCfg.label} 
              sx={{ bgcolor: curCfg.bg, color: curCfg.color, fontWeight: 700, border: `1px solid ${curCfg.color}33` }} 
            />
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Button 
                fullWidth variant={driverInfo.status === 'OFFLINE' ? 'contained' : 'outlined'}
                onClick={() => handleStatusChange('OFFLINE')}
                sx={{ 
                  py: 1.5, 
                  bgcolor: driverInfo.status === 'OFFLINE' ? '#5a5855' : 'transparent',
                  color: driverInfo.status === 'OFFLINE' ? '#fff' : '#a09d9a',
                  borderColor: '#5a5855',
                }}
              >
                Nghỉ
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button 
                fullWidth variant={driverInfo.status === 'IDLE' ? 'contained' : 'outlined'}
                onClick={() => handleStatusChange('IDLE')}
                sx={{ 
                  py: 1.5, 
                  bgcolor: driverInfo.status === 'IDLE' ? '#4ade80' : 'transparent',
                  color: driverInfo.status === 'IDLE' ? '#052e16' : '#4ade80',
                  borderColor: '#4ade80',
                }}
              >
                Sẵn sàng
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Active Order (assigned to me) */}
      {myActiveOrders.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={1.5}>Đơn Đang Xử Lý</Typography>
          {myActiveOrders.map(order => (
             <Card key={order.id} variant="outlined" sx={{ mb: 2, border: '1px solid rgba(245,158,11,0.3)', bgcolor: 'rgba(245,158,11,0.05)' }}>
               <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                   <Typography variant="body2" fontWeight={700} color="primary.main">{formatVND(order.price)}</Typography>
                   <Chip label={order.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                 </Box>
                 <Typography variant="caption" color="text.secondary" display="block">Điểm đón</Typography>
                 <Typography variant="body2" fontWeight={600} mb={1}>{order.origin}</Typography>
                 
                 <Typography variant="caption" color="text.secondary" display="block">Điểm đến</Typography>
                 <Typography variant="body2" fontWeight={600} mb={2}>{order.destination}</Typography>
                 
                 <Typography variant="caption" color="text.secondary" display="block">SĐT Khách</Typography>
                 <Typography variant="body2" fontWeight={600} mb={2} color="secondary.main">{order.customer_phone}</Typography>

                 <Button 
                   fullWidth variant="contained" 
                   onClick={() => handleCompleteOrderClick(order)}
                   startIcon={<CheckCircleRoundedIcon />}
                   sx={{ bgcolor: '#4ade80', color: '#052e16', fontWeight: 700, py: 1.2 }}
                 >
                   Hoàn Tất & Chụp Ảnh
                 </Button>
               </CardContent>
             </Card>
          ))}
        </Box>
      )}

      {/* Available Orders */}
      <Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>Đơn Chờ Nhận ({availableOrders.length})</Typography>
        {availableOrders.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
            <DirectionsBikeRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Chưa có đơn hàng mới</Typography>
          </Box>
        ) : (
          availableOrders.map(order => (
            <Card key={order.id} variant="outlined" sx={{ mb: 1.5, bgcolor: 'rgba(26,26,36,0.6)' }}>
               <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                   <Typography variant="body2" fontWeight={700} color="text.primary">{formatVND(order.price)}</Typography>
                   <Chip label={order.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                 </Box>
                 <Typography variant="body2" color="text.secondary" noWrap><strong>Từ:</strong> {order.origin}</Typography>
                 <Typography variant="body2" color="text.secondary" noWrap mb={1.5}><strong>Đến:</strong> {order.destination}</Typography>
                 
                 <Button 
                   fullWidth variant="outlined" 
                   onClick={() => handleAcceptOrder(order.id)}
                   disabled={driverInfo.status === 'OFFLINE' || myActiveOrders.length > 0}
                   sx={{ 
                     color: 'primary.main', borderColor: 'primary.main',
                     '&:disabled': { borderColor: 'rgba(241,240,239,0.1)', color: 'text.disabled' }
                   }}
                 >
                   {driverInfo.status === 'OFFLINE' ? 'Cần sẵn sàng để nhận' : 'Nhận Đơn'}
                 </Button>
               </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* Upload Dialog */}
      <Dialog open={!!uploadingOrder} onClose={() => !uploadLoading && setUploadingOrder(null)} fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Tải ảnh bằng chứng
          <IconButton onClick={() => setUploadingOrder(null)} disabled={uploadLoading}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
           <Typography variant="body2" mb={3} color="text.secondary">
             Vui lòng chụp hoặc chọn ảnh giao hàng thành công để hoàn tất đơn này.
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
             sx={{ py: 2 }}
           >
             {uploadLoading ? 'Đang tải lên...' : 'Chụp / Chọn Ảnh'}
           </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
