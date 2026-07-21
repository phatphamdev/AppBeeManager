import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, Typography, Card, CardContent,
  Alert, Chip, CircularProgress, Grid, Tooltip,
} from '@mui/material';
import PeopleRoundedIcon       from '@mui/icons-material/PeopleRounded';
import FiberManualRecordIcon   from '@mui/icons-material/FiberManualRecord';
import MyLocationRoundedIcon   from '@mui/icons-material/MyLocationRounded';
import DataGrid, {
  Column, Editing, Sorting, FilterRow, Pager, Paging, Toolbar, Item as ToolbarItem,
} from 'devextreme-react/data-grid';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../supabaseClient.js';

/* ── Fix Leaflet default icon ──────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ── Status config ─────────────────────────────────────────── */
const STATUS_CONFIG = {
  OFFLINE:    { label: 'Ngoại tuyến', color: '#a09d9a', bg: 'rgba(160,157,154,0.12)', dot: '#a09d9a' },
  IDLE:       { label: 'Rảnh',        color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  dot: '#4ade80' },
  PICKING_UP: { label: 'Đang đón',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  dot: '#fb923c' },
  DELIVERING: { label: 'Đang giao',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', dot: '#f87171' },
};

/* ── Custom Leaflet marker icon theo status ─────────────────── */
function createDriverIcon(status) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <ellipse cx="18" cy="41" rx="8" ry="3" fill="rgba(0,0,0,0.3)"/>
      <path d="M18 0 C8 0 0 8 0 18 C0 30 18 44 18 44 C18 44 36 30 36 18 C36 8 28 0 18 0Z" fill="${cfg.dot}" />
      <circle cx="18" cy="18" r="9" fill="#1a1a24" />
      <text x="18" y="23" text-anchor="middle" font-size="13" fill="${cfg.dot}">🏍</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

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

/* ── Tự động di chuyển map về vị trí tài xế đầu tiên ────────── */
function MapAutoCenter({ drivers }) {
  const map = useMap();
  const centered = useRef(false);
  useEffect(() => {
    if (!centered.current) {
      const withGps = drivers.filter(d => d.latitude && d.longitude);
      if (withGps.length > 0) {
        map.setView([withGps[0].latitude, withGps[0].longitude], 13, { animate: true });
        centered.current = true;
      }
    }
  }, [drivers, map]);
  return null;
}

/* ── Live Map Component ─────────────────────────────────────── */
function DriversLiveMap({ drivers }) {
  const activeDrivers = drivers.filter(d => d.latitude && d.longitude);

  return (
    <Box sx={{
      height: '100%',
      minHeight: 450,
      borderRadius: 2,
      overflow: 'hidden',
      border: '1px solid rgba(245,158,11,0.15)',
      position: 'relative',
    }}>
      {activeDrivers.length === 0 && (
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(16,16,24,0.75)', backdropFilter: 'blur(4px)',
          gap: 1,
        }}>
          <MyLocationRoundedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">Chưa có tài xế nào chia sẻ vị trí GPS</Typography>
          <Typography variant="caption" color="text.disabled">Tài xế cần bật trạng thái Sẵn sàng để bật GPS</Typography>
        </Box>
      )}
      <MapContainer
        center={[21.028511, 105.804817]}  // Hà Nội mặc định
        zoom={12}
        style={{ height: '100%', minHeight: 450, background: '#1a1a24' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapAutoCenter drivers={drivers} />
        {activeDrivers.map(driver => (
          <Marker
            key={driver.id}
            position={[driver.latitude, driver.longitude]}
            icon={createDriverIcon(driver.status)}
          >
            <Popup>
              <Box sx={{ p: 0.5, minWidth: 160 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1a1a24' }}>
                  🏍 {driver.full_name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#555', display: 'block' }}>
                  📞 {driver.phone_number}
                </Typography>
                <Box mt={0.5}>
                  <StatusChip value={driver.status} />
                </Box>
                <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5 }}>
                  📍 {driver.latitude?.toFixed(5)}, {driver.longitude?.toFixed(5)}
                </Typography>
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
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
      .channel('drivers-realtime-page')
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
    const { id, auth_user_id, updated_at, latitude, longitude, ...payload } = e.data;
    const { error: err } = await supabase.from('drivers').insert([{ ...payload, status: 'OFFLINE' }]);
    if (err) setError(`Lỗi thêm: ${err.message}`);
    fetchDrivers();
  };
  const onRowUpdated = async (e) => {
    const { id, auth_user_id, updated_at, latitude, longitude, ...payload } = e.data;
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

  const activeOnMap = drivers.filter(d => d.latitude && d.longitude).length;

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
            <Chip
              label={`📡 ${activeOnMap} đang phát GPS`}
              size="small"
              sx={{
                bgcolor: activeOnMap > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(160,157,154,0.1)',
                color: activeOnMap > 0 ? '#4ade80' : '#a09d9a',
                fontWeight: 700, fontSize: '0.7rem', ml: 1,
                ...(activeOnMap > 0 && {
                  animation: 'livePulse 2s ease-in-out infinite',
                  '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                }),
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" ml={6}>
            CRUD tài xế, theo dõi trạng thái và vị trí GPS thời gian thực
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
          <Grid size={{ xs: 12, lg: 5 }}>
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
                      <Column dataField="full_name" caption="Họ tên" minWidth={130} validationRules={[{type:'required'}]} />
                      <Column dataField="phone_number" caption="SĐT" width={130} validationRules={[{type:'required'}]} />
                      <Column dataField="status" caption="Trạng thái" width={130} cellRender={({value}) => <StatusChip value={value} />} allowEditing={false} />
                      <Column caption="GPS" width={80} allowFiltering={false} allowSorting={false} allowEditing={false}
                        cellRender={({data}) => data.latitude && data.longitude
                          ? <Tooltip title={`${data.latitude?.toFixed(4)}, ${data.longitude?.toFixed(4)}`}><Chip label="📡" size="small" sx={{ bgcolor: 'rgba(74,222,128,0.12)', color: '#4ade80', cursor: 'pointer' }} /></Tooltip>
                          : <Chip label="—" size="small" sx={{ color: '#5a5855', bgcolor: 'transparent' }} />
                        }
                      />
                    </DataGrid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Live Map */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>🗺️ Bản Đồ Tài Xế Realtime</Typography>
                  <Chip label="● LIVE" size="small" sx={{
                    bgcolor: 'rgba(74,222,128,0.15)', color: '#4ade80', fontWeight: 700, fontSize: '0.65rem',
                    animation: 'livePulse 2s ease-in-out infinite',
                    '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                  }} />
                </Box>
                <Box sx={{ flex: 1, minHeight: 450 }}>
                  <DriversLiveMap drivers={drivers} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
