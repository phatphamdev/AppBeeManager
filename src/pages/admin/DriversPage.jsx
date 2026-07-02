import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Typography, Card, CardContent,
  Alert, Chip, CircularProgress, Grid, Tooltip,
} from '@mui/material';
import PeopleRoundedIcon       from '@mui/icons-material/PeopleRounded';
import FiberManualRecordIcon   from '@mui/icons-material/FiberManualRecord';
import DataGrid, {
  Column, Editing, Sorting, FilterRow, Pager, Paging, Toolbar, Item as ToolbarItem,
} from 'devextreme-react/data-grid';
import { supabase } from '../../supabaseClient.js';

/* ── Status config ─────────────────────────────────────────── */
const STATUS_CONFIG = {
  OFFLINE:    { label: 'Ngoại tuyến', color: '#a09d9a', bg: 'rgba(160,157,154,0.12)' },
  IDLE:       { label: 'Rảnh',        color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  PICKING_UP: { label: 'Đang đón',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  DELIVERING: { label: 'Đang giao',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

function StatusChip({ value }) {
  const cfg = STATUS_CONFIG[value] || STATUS_CONFIG.OFFLINE;
  return (
    <Chip
      icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: `${cfg.color} !important` }} />}
      label={cfg.label}
      size="small"
      sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
    />
  );
}

const gridSx = {
  '& .dx-datagrid': { backgroundColor: 'transparent', color: '#f1f0ef', fontFamily: 'Inter, sans-serif' },
  '& .dx-datagrid-headers .dx-datagrid-table .dx-row > td': {
    backgroundColor: 'rgba(241,240,239,0.04)', color: '#a09d9a', fontWeight: 600,
    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(241,240,239,0.1)',
  },
  '& .dx-datagrid-rowsview .dx-row': { borderBottom: '1px solid rgba(241,240,239,0.05)' },
  '& .dx-datagrid-rowsview .dx-row:hover': { backgroundColor: 'rgba(245,158,11,0.06) !important' },
  '& .dx-toolbar': { backgroundColor: 'transparent', marginBottom: 1 },
  '& .dx-button': { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)', color: '#fcd34d', borderRadius: 6 },
  '& .dx-button:hover': { backgroundColor: 'rgba(245,158,11,0.2)' },
};

/* ── Real-time Status Card ─────────────────────────────────── */
function DriverStatusCard({ driver }) {
  const cfg = STATUS_CONFIG[driver.status] || STATUS_CONFIG.OFFLINE;
  return (
    <Card variant="outlined" sx={{
      border: `1px solid ${cfg.color}33`,
      background: `linear-gradient(135deg, ${cfg.bg} 0%, transparent 80%)`,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Box sx={{
        position: 'absolute', top: 0, left: 0, width: 3, bottom: 0,
        bgcolor: cfg.color, borderRadius: '3px 0 0 3px',
      }} />
      <CardContent sx={{ p: 2, pl: 2.5, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: '65%' }}>
            {driver.full_name}
          </Typography>
          <StatusChip value={driver.status} />
        </Box>
        <Typography variant="caption" color="text.secondary">📞 {driver.phone_number}</Typography>
      </CardContent>
    </Card>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  /* ── Fetch drivers ─────────────────────────────────────────── */
  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.from('drivers').select('*').order('full_name');
    if (err) setError(err.message); else setDrivers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  /* ── Supabase Realtime subscription ───────────────────────── */
  useEffect(() => {
    const channel = supabase
      .channel('drivers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setDrivers(prev => prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d));
        } else if (payload.eventType === 'INSERT') {
          setDrivers(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setDrivers(prev => prev.filter(d => d.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ── CRUD handlers ─────────────────────────────────────────── */
  const onRowInserted = async (e) => {
    const { id, auth_user_id, updated_at, ...payload } = e.data;
    const { error: err } = await supabase.from('drivers').insert([{ ...payload, status: 'OFFLINE' }]);
    if (err) setError(`Lỗi thêm: ${err.message}`);
    fetchDrivers();
  };
  const onRowUpdated = async (e) => {
    const { id, auth_user_id, updated_at, ...payload } = e.data;
    const { error: err } = await supabase.from('drivers').update(payload).eq('id', id);
    if (err) { setError(`Lỗi cập nhật: ${err.message}`); fetchDrivers(); }
  };
  const onRowRemoved = async (e) => {
    const { error: err } = await supabase.from('drivers').delete().eq('id', e.data.id);
    if (err) setError(`Lỗi xóa: ${err.message}`);
  };

  const statusSummary = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key, ...cfg, count: drivers.filter(d => d.status === key).length,
  }));

  return (
    <Box className="page-enter" sx={{ minHeight: 'calc(100vh - 64px)', py: 3 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PeopleRoundedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">Quản Lý Tài Xế</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" ml={6}>
            CRUD tài xế và theo dõi trạng thái thời gian thực
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Status Summary */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {statusSummary.map(s => (
            <Grid key={s.key} size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined" sx={{ border: `1px solid ${s.color}33`, bgcolor: s.bg }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* DataGrid CRUD */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>Danh Sách Tài Xế</Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>
                ) : (
                  <Box sx={gridSx}>
                    <DataGrid dataSource={drivers} keyExpr="id" showBorders={false} showColumnLines={false} showRowLines columnAutoWidth
                      onRowInserted={onRowInserted} onRowUpdated={onRowUpdated} onRowRemoved={onRowRemoved}>
                      <Editing mode="row" allowAdding allowUpdating allowDeleting confirmDelete useIcons />
                      <FilterRow visible /><Sorting mode="multiple" /><Paging defaultPageSize={10} />
                      <Pager showPageSizeSelector allowedPageSizes={[5,10,20]} showInfo infoText="Trang {0}/{1} ({2} bản ghi)" />
                      <Toolbar>
                        <ToolbarItem name="addRowButton" showText="always" />
                        <ToolbarItem name="revertButton" />
                        <ToolbarItem name="saveButton" />
                      </Toolbar>
                      <Column dataField="id" caption="ID" width={60} allowEditing={false} alignment="center" />
                      <Column dataField="full_name" caption="Họ tên" minWidth={150} validationRules={[{type:'required'}]} />
                      <Column dataField="phone_number" caption="Số điện thoại" width={140} validationRules={[{type:'required'}]} />
                      <Column dataField="status" caption="Trạng thái" width={140} cellRender={({value}) => <StatusChip value={value} />} allowEditing={false} />
                    </DataGrid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Real-time Status Board */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>Bảng Trạng Thái Realtime</Typography>
                  <Chip label="LIVE" size="small" sx={{ bgcolor: 'rgba(74,222,128,0.15)', color: '#4ade80', fontWeight: 700, fontSize: '0.65rem',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                  }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 450, overflowY: 'auto', pr: 0.5 }}>
                  {drivers.length === 0
                    ? <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>Chưa có tài xế nào.</Typography>
                    : drivers.map(d => <DriverStatusCard key={d.id} driver={d} />)
                  }
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
