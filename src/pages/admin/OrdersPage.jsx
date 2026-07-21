import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Container, Typography, Card, CardContent,
  Alert, Chip, CircularProgress, Button, Select, MenuItem, FormControl, InputLabel, Grid
} from '@mui/material';
import AssignmentRoundedIcon   from '@mui/icons-material/AssignmentRounded';
import QrCodeRoundedIcon       from '@mui/icons-material/QrCodeRounded';
import FiberManualRecordIcon   from '@mui/icons-material/FiberManualRecord';
import DataGrid, {
  Column, Sorting, FilterRow, Pager, Paging,
} from 'devextreme-react/data-grid';
import { supabase }           from '../../supabaseClient.js';
import { VietQRDialog }       from '../../components/VietQR.jsx';
import { gridSx, formatVND } from '../../utils/shared.jsx';



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





export default function OrdersPage() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [qrOrder, setQrOrder]   = useState(null);

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
        fetchOrders(); // Refetch để lấy join với drivers
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  // Derived state for Filtering and Revenue
  const { displayedOrders, uniqueDrivers, revenueToday } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const filtered = selectedDriverId === 'ALL' ? orders : orders.filter(o => o.driver_id === selectedDriverId);
    
    let revToday = 0;
    filtered.forEach(o => {
      if (o.status === 'COMPLETED' && new Date(o.created_at) >= todayStart) {
        revToday += o.price || 0;
      }
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
            Theo dõi và quản lý đơn hàng thời gian thực
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
                sx={{ fontWeight: 800, bgcolor: 'rgba(252, 211, 77, 0.12)', color: '#fcd34d', border: '1px solid rgba(252, 211, 77, 0.3)', px: 1, ml: 'auto' }}
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

        <Card variant="outlined">
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>
            ) : (
              <Box sx={gridSx}>
                <DataGrid dataSource={displayedOrders} keyExpr="id" showBorders={false} showColumnLines={false} showRowLines columnAutoWidth>
                  <FilterRow visible /><Sorting mode="multiple" /><Paging defaultPageSize={15} />
                  <Pager showPageSizeSelector allowedPageSizes={[10,15,30]} showInfo infoText="Trang {0}/{1} ({2} đơn)" />
                  <Column dataField="id" caption="ID" width={100} allowEditing={false}
                    cellRender={({value}) => <span style={{ fontSize: '0.75rem', color: '#a09d9a' }}>{value?.slice(0,8)}...</span>} />
                  <Column dataField="customer_phone" caption="Khách hàng" width={130} />
                  <Column dataField="service_name" caption="Dịch vụ" width={130}
                    cellRender={({value}) => value
                      ? <Chip label={value} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main', fontWeight: 600 }} />
                      : <span style={{color:'#5a5855',fontSize:'0.78rem'}}>—</span>} />
                  <Column dataField="origin" caption="Điểm đón" minWidth={140}
                    cellRender={({value}) => <span style={{ fontSize: '0.82rem' }}>{value}</span>} />
                  <Column dataField="destination" caption="Điểm đến" minWidth={140}
                    cellRender={({value}) => <span style={{ fontSize: '0.82rem' }}>{value}</span>} />
                  <Column dataField="notes" caption="Ghi chú" minWidth={140}
                    cellRender={({value}) => value
                      ? <span style={{ fontSize: '0.8rem', color: '#a5f3fc' }}>📝 {value}</span>
                      : <span style={{color:'#5a5855',fontSize:'0.78rem'}}>—</span>} />
                  <Column dataField="price" caption="Cước phí" width={130} alignment="right" cellRender={({value}) => <CurrencyCell value={value} />} />
                  <Column dataField="payment_method" caption="Thanh toán" width={120}
                    cellRender={({value}) => <Chip label={value === 'CASH' ? '💵 Tiền mặt' : '🏦 CK'} size="small" sx={{ fontSize: '0.72rem', fontWeight: 700 }} />} />
                  <Column dataField="status" caption="Trạng thái" width={130} cellRender={({value}) => <OrderStatusChip value={value} />} />
                  <Column dataField="drivers.full_name" caption="Tài xế" width={140}
                    cellRender={({data}) => <span>{data.drivers?.full_name || <span style={{color:'#5a5855'}}>Chưa gán</span>}</span>} />
                  {/* GPS Check-in Điểm Đón */}
                  <Column caption="📍 GPS Đón" width={140} allowFiltering={false} allowSorting={false}
                    cellRender={({data}) => data.pickup_checkin_lat
                      ? (
                        <Box component="a"
                          href={`https://www.google.com/maps?q=${data.pickup_checkin_lat},${data.pickup_checkin_lng}`}
                          target="_blank" rel="noopener noreferrer"
                          sx={{ color: '#fb923c', fontSize: '0.75rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          📍 {Number(data.pickup_checkin_lat).toFixed(4)},{Number(data.pickup_checkin_lng).toFixed(4)}
                        </Box>
                      ) : <span style={{color:'#5a5855',fontSize:'0.78rem'}}>—</span>}
                  />
                  {/* GPS Check-in Giao Hàng */}
                  <Column caption="🏁 GPS Giao" width={140} allowFiltering={false} allowSorting={false}
                    cellRender={({data}) => data.delivery_checkin_lat
                      ? (
                        <Box component="a"
                          href={`https://www.google.com/maps?q=${data.delivery_checkin_lat},${data.delivery_checkin_lng}`}
                          target="_blank" rel="noopener noreferrer"
                          sx={{ color: '#4ade80', fontSize: '0.75rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          🏁 {Number(data.delivery_checkin_lat).toFixed(4)},{Number(data.delivery_checkin_lng).toFixed(4)}
                        </Box>
                      ) : <span style={{color:'#5a5855',fontSize:'0.78rem'}}>—</span>}
                  />
                  <Column caption="QR" width={110} allowFiltering={false} allowSorting={false}
                    cellRender={({data}) => data.payment_method === 'TRANSFER' && data.status !== 'COMPLETED' ? (
                      <Button size="small" startIcon={<QrCodeRoundedIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ fontSize: '0.7rem', color: 'secondary.main', borderColor: 'rgba(6,182,212,0.3)', py: 0.25 }}
                        variant="outlined" onClick={() => setQrOrder(data)}>
                        VietQR
                      </Button>
                    ) : null}
                  />
                  <Column dataField="proof_image_url" caption="Ảnh giao hàng" width={130}
                    cellRender={({value}) => value
                      ? <Box component="a" href={value} target="_blank" sx={{ color: 'secondary.main', fontSize: '0.78rem' }}>Xem ảnh</Box>
                      : <span style={{color:'#5a5855',fontSize:'0.78rem'}}>Chưa có</span>}
                  />
                  <Column dataField="created_at" caption="Tạo lúc" width={160} dataType="datetime"
                    format="dd/MM/yyyy HH:mm" />
                </DataGrid>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

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
