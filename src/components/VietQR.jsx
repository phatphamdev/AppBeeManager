import React, { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Alert,
  Skeleton, IconButton, Tooltip,
} from '@mui/material';
import QrCodeRoundedIcon     from '@mui/icons-material/QrCodeRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon      from '@mui/icons-material/CheckRounded';
import OpenInNewRoundedIcon  from '@mui/icons-material/OpenInNewRounded';
import { formatVND } from '../utils/shared.jsx';

/**
 * Tạo link VietQR theo chuẩn img.vietqr.io
 *
 * Để hoạt động thực tế, cần thiết lập:
 *   VITE_VIETQR_BANK_ID   — VD: "MB", "VCB", "TCB"
 *   VITE_VIETQR_ACCOUNT   — Số tài khoản thực
 *   VITE_VIETQR_NAME      — Tên chủ tài khoản
 */
function buildVietQRUrl({ amount, description }) {
  const bankId  = import.meta.env.VITE_VIETQR_BANK_ID  || 'MB';
  const account = import.meta.env.VITE_VIETQR_ACCOUNT   || '0000000000';
  const name    = import.meta.env.VITE_VIETQR_NAME      || 'BEESHIP';
  const desc    = encodeURIComponent(description || 'BeeShip');
  return `https://img.vietqr.io/image/${bankId}-${account}-compact2.png?amount=${Math.round(amount)}&addInfo=${desc}&accountName=${encodeURIComponent(name)}`;
}

/**
 * VietQRDialog — Dialog hiển thị mã QR chuyển khoản
 *
 * Props:
 *   open: boolean
 *   onClose: function
 *   amount: number — Số tiền
 *   description: string — Nội dung chuyển khoản
 *   title: string — Tiêu đề dialog (optional)
 */
export function VietQRDialog({ open, onClose, amount, description, title }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrUrl = buildVietQRUrl({ amount, description });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ onExited: () => { setImgError(false); setImgLoaded(false); } }}
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <QrCodeRoundedIcon sx={{ color: 'primary.main' }} />
        {title || `VietQR — ${formatVND(amount)}`}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 1 }}>
          {/* QR Image */}
          {!imgError ? (
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              {!imgLoaded && (
                <Skeleton variant="rectangular" width={240} height={280} sx={{ borderRadius: 2, mx: 'auto' }} />
              )}
              <Box
                component="img"
                src={qrUrl}
                alt={`VietQR ${formatVND(amount)}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                sx={{
                  width: 240,
                  maxWidth: '100%',
                  borderRadius: 2,
                  display: imgLoaded ? 'block' : 'none',
                  mx: 'auto',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}
              />
            </Box>
          ) : (
            <Alert severity="warning" sx={{ textAlign: 'left' }}>
              Không tải được ảnh QR. Vui lòng thiết lập <strong>VITE_VIETQR_BANK_ID</strong>,{' '}
              <strong>VITE_VIETQR_ACCOUNT</strong> trong file <code>.env</code>.
            </Alert>
          )}

          {/* Amount */}
          <Typography variant="h5" fontWeight={800} sx={{ color: 'primary.main', mt: 2, mb: 0.5 }}>
            {formatVND(amount)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Nội dung: {description}
          </Typography>

          {/* Link */}
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(241,240,239,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flex: 1, wordBreak: 'break-all', textAlign: 'left', fontSize: '0.7rem' }}
            >
              {qrUrl}
            </Typography>
            <Tooltip title={copied ? 'Đã sao chép!' : 'Sao chép link'}>
              <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? 'success.main' : 'text.secondary', flexShrink: 0 }}>
                {copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Mở trong tab mới">
              <IconButton size="small" component="a" href={qrUrl} target="_blank" rel="noopener noreferrer" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                <OpenInNewRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Alert severity="info" sx={{ mt: 2, fontSize: '0.78rem', textAlign: 'left' }}>
            Gửi link QR lên Zalo để khách quét và chuyển khoản <strong>{formatVND(amount)}</strong>.
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Đóng</Button>
        <Button
          variant="outlined"
          startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          onClick={handleCopy}
          sx={{ color: 'primary.main', borderColor: 'rgba(245,158,11,0.3)' }}
        >
          {copied ? 'Đã sao chép' : 'Sao chép link'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * VietQRButton — Button đơn giản mở VietQRDialog
 */
export function VietQRButton({ amount, description, label = 'VietQR', size = 'small' }) {
  const [open, setOpen] = useState(false);
  if (!amount) return null;
  return (
    <>
      <Button
        size={size}
        variant="outlined"
        startIcon={<QrCodeRoundedIcon />}
        onClick={() => setOpen(true)}
        sx={{ color: 'secondary.main', borderColor: 'rgba(6,182,212,0.3)', fontSize: '0.72rem' }}
      >
        {label}
      </Button>
      <VietQRDialog
        open={open}
        onClose={() => setOpen(false)}
        amount={amount}
        description={description}
      />
    </>
  );
}
