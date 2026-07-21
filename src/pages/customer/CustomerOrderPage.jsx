import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert,
  CircularProgress, Stepper, Step, StepLabel, Chip,
  Divider, Radio, RadioGroup, FormControlLabel,
} from '@mui/material';
import CheckCircleRoundedIcon    from '@mui/icons-material/CheckCircleRounded';
import LocalShippingRoundedIcon  from '@mui/icons-material/LocalShippingRounded';
import RouteRoundedIcon          from '@mui/icons-material/RouteRounded';
import PaymentsRoundedIcon       from '@mui/icons-material/PaymentsRounded';
import PhoneRoundedIcon          from '@mui/icons-material/PhoneRounded';
import NotesRoundedIcon          from '@mui/icons-material/NotesRounded';
import PlacesAutocomplete        from '../../components/PlacesAutocomplete.jsx';
import { supabase }              from '../../supabaseClient.js';
import { formatVND }             from '../../utils/shared.jsx';
import { useAuth }               from '../../contexts/AuthContext.jsx';

const STEPS = ['Chọn dịch vụ', 'Địa chỉ & Thông tin', 'Xác nhận đặt hàng'];

function calcPrice(service, distance_km) {
  if (!service || !distance_km) return null;
  const { base_price, base_km, per_km_price } = service;
  const extraKm = Math.max(0, distance_km - base_km);
  const total = base_price + extraKm * per_km_price;
  return { base_price, extraKm, extra_fare: extraKm * per_km_price, total };
}

/* ── Haversine distance (km) ─────────────────── */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const SERVICE_ICONS = ['🚚', '🏍', '🍔', '🛵', '🎂', '🛍'];

export default function CustomerOrderPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user }   = useAuth();

  const [step, setStep]       = useState(0);
  const [services, setServices] = useState([]);
  const [surcharges, setSurcharges] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError]     = useState('');

  /* Step 1 */
  const [selectedServiceId, setSelectedServiceId] = useState(location.state?.serviceId || '');

  /* Step 2 */
  const [origin, setOrigin]             = useState(null);
  const [originText, setOriginText]     = useState('');
  const [destination, setDestination]   = useState(null);
  const [destinationText, setDestinationText] = useState('');
  const [customerPhone, setCustomerPhone]     = useState('');
  const [notes, setNotes]               = useState('');
  const [paymentMethod, setPaymentMethod]     = useState('CASH');
  const [routeDistance, setRouteDistance]     = useState(null);

  /* Step 3 */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoadingData(true);
      const [{ data: svcData, error: svcErr }, { data: surData }] = await Promise.all([
        supabase.from('services').select('*').order('id'),
        supabase.from('surcharges').select('*').eq('is_active', true),
      ]);
      if (svcErr) setDataError(svcErr.message);
      else {
        setServices(svcData || []);
        setSurcharges(surData || []);
        // Nếu có serviceId từ state, chọn luôn
        if (location.state?.serviceId && svcData?.length) {
          setSelectedServiceId(location.state.serviceId);
          setStep(1);
        } else if (svcData?.length && !selectedServiceId) {
          setSelectedServiceId(svcData[0].id);
        }
      }
      setLoadingData(false);
    }
    fetchData();
  }, []); // eslint-disable-line

  /* Tính khoảng cách khi có 2 điểm */
  useEffect(() => {
    if (origin?.lat && destination?.lat) {
      const dist = haversine(origin.lat, origin.lng, destination.lat, destination.lng);
      setRouteDistance(parseFloat(dist.toFixed(2)));
    }
  }, [origin, destination]);

  const handleOriginSelected   = useCallback(p => { setOrigin(p); setOriginText(p.address); }, []);
  const handleDestSelected     = useCallback(p => { setDestination(p); setDestinationText(p.address); }, []);

  const selectedService = services.find(s => s.id === selectedServiceId);
  const priceBreakdown  = calcPrice(selectedService, routeDistance);

  const canGoStep2 = !!selectedServiceId;
  const canGoStep3 = origin && destination && customerPhone.trim();

  const handleSubmit = async () => {
    if (!canGoStep3 || !selectedService) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { error: err } = await supabase.from('orders').insert([{
        customer_user_id: user.id,
        customer_name:    user.user_metadata?.full_name || null,
        customer_phone:   customerPhone.trim(),
        notes:            notes.trim() || null,
        service_name:     selectedService.name,
        origin:           originText,
        destination:      destinationText,
        origin_lat:       origin?.lat ?? null,
        origin_lng:       origin?.lng ?? null,
        price:            Math.round(priceBreakdown?.total || 0),
        payment_method:   paymentMethod,
        status:           'PENDING',
        driver_id:        null,
      }]);
      if (err) throw err;
      setSuccess(true);
    } catch (e) {
      setSubmitError(e.message || 'Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 72, color: '#4ade80', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} mb={1}>Đặt hàng thành công!</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Đơn hàng của bạn đã được gửi đến bộ phận điều phối. Shipper sẽ nhận đơn sớm nhất có thể.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate('/customer/orders')}
              sx={{ fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              Xem đơn hàng của tôi
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => { setSuccess(false); setStep(0); setOrigin(null); setDestination(null); setOriginText(''); setDestinationText(''); setCustomerPhone(''); setNotes(''); setRouteDistance(null); }}
              sx={{ borderColor: 'rgba(241,240,239,0.2)', color: 'text.secondary' }}
            >
              Đặt thêm dịch vụ
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      className="page-enter"
      sx={{
        minHeight: 'calc(100vh - 56px)',
        background: 'radial-gradient(ellipse at 70% 0%, rgba(6,182,212,0.05) 0%, transparent 60%)',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 3 },
        maxWidth: 600,
        mx: 'auto',
      }}
    >
      {/* Stepper */}
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map(label => (
          <Step key={label}>
            <StepLabel
              sx={{
                '& .MuiStepLabel-label': { fontSize: '0.72rem', color: 'text.secondary' },
                '& .MuiStepLabel-label.Mui-active': { color: 'primary.main', fontWeight: 700 },
                '& .MuiStepLabel-label.Mui-completed': { color: '#4ade80' },
                '& .MuiStepIcon-root': { color: 'rgba(241,240,239,0.15)' },
                '& .MuiStepIcon-root.Mui-active': { color: 'primary.main' },
                '& .MuiStepIcon-root.Mui-completed': { color: '#4ade80' },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {dataError && <Alert severity="error" sx={{ mb: 2 }}>{dataError}</Alert>}

      {/* ── STEP 0: Chọn dịch vụ ── */}
      {step === 0 && (
        <Box>
          <Typography variant="h6" fontWeight={700} mb={0.5}>Chọn loại dịch vụ</Typography>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Bạn cần loại dịch vụ nào?
          </Typography>
          {loadingData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {services.map((svc, i) => (
                <Card
                  key={svc.id}
                  variant="outlined"
                  onClick={() => setSelectedServiceId(svc.id)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedServiceId === svc.id
                      ? '2px solid #f59e0b'
                      : '1px solid rgba(241,240,239,0.1)',
                    background: selectedServiceId === svc.id
                      ? 'rgba(245,158,11,0.06)'
                      : 'transparent',
                    transition: 'all 0.18s',
                    '&:hover': { border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.04)' },
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontSize: 28, lineHeight: 1, userSelect: 'none' }}>
                      {SERVICE_ICONS[i % SERVICE_ICONS.length]}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{svc.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Từ {formatVND(svc.base_price)} / {svc.base_km} km đầu &nbsp;·&nbsp; +{formatVND(svc.per_km_price)}/km thêm
                      </Typography>
                    </Box>
                    {selectedServiceId === svc.id && (
                      <CheckCircleRoundedIcon sx={{ color: '#f59e0b', fontSize: 22 }} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
          <Button
            variant="contained" fullWidth size="large"
            disabled={!canGoStep2 || loadingData}
            onClick={() => setStep(1)}
            sx={{
              mt: 3, py: 1.4, fontWeight: 700, fontSize: '1rem',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}
          >
            Tiếp theo →
          </Button>
        </Box>
      )}

      {/* ── STEP 1: Địa chỉ & Thông tin ── */}
      {step === 1 && (
        <Box>
          <Typography variant="h6" fontWeight={700} mb={0.5}>Địa chỉ &amp; Thông tin</Typography>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Dịch vụ: <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>{selectedService?.name}</Box>
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card variant="outlined" sx={{ overflow: 'visible' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RouteRoundedIcon sx={{ color: 'primary.main', fontSize: 18 }} />Hành trình
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <PlacesAutocomplete
                    label="📍 Điểm đón / Lấy hàng"
                    value={originText}
                    onChange={setOriginText}
                    onPlaceSelected={handleOriginSelected}
                    type="origin"
                  />
                  <PlacesAutocomplete
                    label="🏁 Điểm giao / Đến"
                    value={destinationText}
                    onChange={setDestinationText}
                    onPlaceSelected={handleDestSelected}
                    type="destination"
                  />
                  {routeDistance && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                      <Chip
                        icon={<RouteRoundedIcon />}
                        label={`~${routeDistance} km`}
                        size="small"
                        sx={{ bgcolor: 'rgba(6,182,212,0.12)', color: 'secondary.main', fontWeight: 700 }}
                      />
                      {priceBreakdown && (
                        <Chip
                          icon={<PaymentsRoundedIcon />}
                          label={`Ước tính: ${formatVND(priceBreakdown.total)}`}
                          size="small"
                          sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main', fontWeight: 700 }}
                        />
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneRoundedIcon sx={{ color: 'secondary.main', fontSize: 18 }} />Thông tin liên lạc
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField
                    fullWidth size="small"
                    label="Số điện thoại liên lạc *"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="VD: 0901234567"
                    slotProps={{
                      input: {
                        startAdornment: <PhoneRoundedIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} />,
                      },
                    }}
                  />
                  <TextField
                    fullWidth size="small"
                    label="Ghi chú / Yêu cầu thêm"
                    multiline rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="VD: Giao trước 10h, gọi trước khi đến, mua 1 ly trà sữa..."
                    slotProps={{
                      input: {
                        startAdornment: <NotesRoundedIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18, alignSelf: 'flex-start', mt: '10px' }} />,
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PaymentsRoundedIcon sx={{ color: '#4ade80', fontSize: 18 }} />Thanh toán
                </Typography>
                <RadioGroup
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  row
                >
                  <FormControlLabel
                    value="CASH"
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#4ade80' } }} />}
                    label={<Typography variant="body2">💵 Tiền mặt</Typography>}
                  />
                  <FormControlLabel
                    value="TRANSFER"
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#06b6d4' } }} />}
                    label={<Typography variant="body2">🏦 Chuyển khoản</Typography>}
                  />
                </RadioGroup>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
            <Button
              variant="outlined" size="large"
              onClick={() => setStep(0)}
              sx={{ flex: 1, py: 1.4, borderColor: 'rgba(241,240,239,0.2)', color: 'text.secondary' }}
            >
              ← Quay lại
            </Button>
            <Button
              variant="contained" size="large"
              disabled={!canGoStep3}
              onClick={() => setStep(2)}
              sx={{
                flex: 2, py: 1.4, fontWeight: 700,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              }}
            >
              Xem lại đơn →
            </Button>
          </Box>
        </Box>
      )}

      {/* ── STEP 2: Xác nhận ── */}
      {step === 2 && (
        <Box>
          <Typography variant="h6" fontWeight={700} mb={0.5}>Xác nhận đơn hàng</Typography>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Kiểm tra thông tin trước khi đặt
          </Typography>

          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}

          <Card variant="outlined" sx={{ mb: 2, border: '1px solid rgba(245,158,11,0.2)' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Dịch vụ</Typography>
                  <Chip label={selectedService?.name} size="small"
                    sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: 'primary.main', fontWeight: 700, fontSize: '0.72rem' }} />
                </Box>
                <Divider sx={{ borderColor: 'rgba(241,240,239,0.08)' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">📍 Điểm đón</Typography>
                  <Typography variant="body2" fontWeight={600} mt={0.3}>{originText}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">🏁 Điểm đến</Typography>
                  <Typography variant="body2" fontWeight={600} mt={0.3}>{destinationText}</Typography>
                </Box>
                {notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">📝 Ghi chú</Typography>
                    <Typography variant="body2" mt={0.3} sx={{ color: '#a5f3fc' }}>{notes}</Typography>
                  </Box>
                )}
                <Divider sx={{ borderColor: 'rgba(241,240,239,0.08)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Số điện thoại</Typography>
                  <Typography variant="body2" fontWeight={700}>{customerPhone}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Thanh toán</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {paymentMethod === 'CASH' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}
                  </Typography>
                </Box>
                {routeDistance && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Khoảng cách</Typography>
                    <Typography variant="body2" fontWeight={700} color="secondary.main">~{routeDistance} km</Typography>
                  </Box>
                )}
              </Box>

              {priceBreakdown && (
                <>
                  <Divider sx={{ my: 2, borderColor: 'rgba(245,158,11,0.2)' }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Tổng ước tính</Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ color: 'primary.main' }}>
                      {formatVND(priceBreakdown.total)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
                    * Giá cuối sẽ được tính chính xác bởi điều phối viên
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined" size="large"
              onClick={() => setStep(1)}
              sx={{ flex: 1, py: 1.4, borderColor: 'rgba(241,240,239,0.2)', color: 'text.secondary' }}
            >
              ← Sửa
            </Button>
            <Button
              variant="contained" size="large"
              disabled={submitting}
              onClick={handleSubmit}
              startIcon={submitting ? <CircularProgress size={18} sx={{ color: '#1a1207' }} /> : <LocalShippingRoundedIcon />}
              sx={{
                flex: 2, py: 1.4, fontWeight: 700, fontSize: '1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
              }}
            >
              {submitting ? 'Đang gửi...' : 'Đặt hàng ngay!'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
