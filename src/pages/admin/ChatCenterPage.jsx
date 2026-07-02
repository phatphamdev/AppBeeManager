import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Container, Typography, Card, CardContent,
  Alert, CircularProgress, Grid, TextField, IconButton,
  Avatar, Divider, List, ListItem, ListItemButton,
  ListItemAvatar, ListItemText, Badge,
} from '@mui/material';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { supabase } from '../../supabaseClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

/* ── Status config ─────────────────────────────────────────── */
const STATUS_CONFIG = {
  OFFLINE:    { color: '#a09d9a' },
  IDLE:       { color: '#4ade80' },
  PICKING_UP: { color: '#fb923c' },
  DELIVERING: { color: '#f87171' },
};

export default function ChatCenterPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ── Fetch Rooms ─────────────────────────────────────────── */
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    const { data, error: err } = await supabase
      .from('chat_rooms')
      .select('*, drivers(full_name, status)')
      .order('last_message_at', { ascending: false });

    if (err) setError(err.message);
    else setRooms(data || []);
    setLoadingRooms(false);
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  /* ── Fetch Messages ──────────────────────────────────────── */
  const fetchMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    setLoadingMessages(true);
    const { data, error: err } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (err) setError(err.message);
    else {
      setMessages(data || []);
      // Mark as read (Admin reading shipper messages)
      const unreadIds = data?.filter(m => m.sender_role === 'SHIPPER' && !m.is_read).map(m => m.id) || [];
      if (unreadIds.length > 0) {
        await supabase.from('chat_messages').update({ is_read: true }).in('id', unreadIds);
        fetchRooms(); // Refresh rooms to update unread badge if any
      }
    }
    setLoadingMessages(false);
  }, [fetchRooms]);

  useEffect(() => {
    if (activeRoomId) fetchMessages(activeRoomId);
  }, [activeRoomId, fetchMessages]);

  /* ── Realtime subscriptions ──────────────────────────────── */
  useEffect(() => {
    // Listen for new messages
    const messageChannel = supabase
      .channel('admin-chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new;
        // If it belongs to active room, add to list
        if (activeRoomId && newMsg.room_id === activeRoomId) {
           setMessages(prev => [...prev, newMsg]);
           // Mark as read immediately if it's from shipper and we are in the room
           if (newMsg.sender_role === 'SHIPPER') {
             supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id).then(()=>fetchRooms());
           }
        } else {
           // Otherwise just fetch rooms to update the list/last message
           fetchRooms();
        }
      })
      .subscribe();

    // Listen for room updates (e.g. driver status change or new room)
    const roomChannel = supabase
      .channel('admin-chat-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => {
         fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [activeRoomId, fetchRooms]);

  /* ── Send Message ────────────────────────────────────────── */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoomId || !user) return;

    const text = newMessage.trim();
    setNewMessage(''); // optimistic clear

    const { error: err } = await supabase.from('chat_messages').insert([{
      room_id: activeRoomId,
      sender_id: user.id,
      sender_role: 'ADMIN',
      message_text: text,
      is_read: false
    }]);

    if (err) setError(`Lỗi gửi tin nhắn: ${err.message}`);
    else {
      // Update last_message in room
      await supabase.from('chat_rooms').update({
        last_message: text,
        last_message_at: new Date().toISOString()
      }).eq('id', activeRoomId);
    }
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  return (
    <Box className="page-enter" sx={{ minHeight: 'calc(100vh - 64px)', py: 3, display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChatRoundedIcon sx={{ color: 'secondary.main', fontSize: 18 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">Trung Tâm Tin Nhắn</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" ml={6}>
            Hỗ trợ tài xế trực tiếp qua hệ thống chat nội bộ
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Card variant="outlined" sx={{ display: 'flex', flex: 1, minHeight: 500, overflow: 'hidden' }}>
          {/* Left Sidebar - Rooms List */}
          <Box sx={{ width: { xs: 80, sm: 280, md: 320 }, borderRight: '1px solid rgba(241,240,239,0.08)', display: 'flex', flexDirection: 'column', bgcolor: 'rgba(26,26,36,0.5)' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(241,240,239,0.08)' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ display: { xs: 'none', sm: 'block' } }}>Cuộc trò chuyện</Typography>
              <ChatRoundedIcon sx={{ display: { xs: 'block', sm: 'none' }, mx: 'auto', color: 'text.secondary' }} />
            </Box>

            {loadingRooms ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: 'primary.main' }} /></Box>
            ) : (
              <List disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
                {rooms.map(room => {
                  const isActive = room.id === activeRoomId;
                  const driverStatus = room.drivers?.status || 'OFFLINE';
                  const statusColor = STATUS_CONFIG[driverStatus]?.color || STATUS_CONFIG.OFFLINE.color;

                  return (
                    <ListItem key={room.id} disablePadding>
                      <ListItemButton
                        selected={isActive}
                        onClick={() => setActiveRoomId(room.id)}
                        sx={{
                          py: 1.5,
                          px: { xs: 1, sm: 2 },
                          borderBottom: '1px solid rgba(241,240,239,0.04)',
                          '&.Mui-selected': { bgcolor: 'rgba(245,158,11,0.12)' }
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 }, display: 'flex', justifyContent: 'center' }}>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={<FiberManualRecordIcon sx={{ fontSize: 14, color: statusColor, borderRadius: '50%', border: '2px solid #1a1a24' }} />}
                          >
                            <Avatar sx={{ bgcolor: isActive ? 'primary.main' : 'rgba(241,240,239,0.1)', color: isActive ? '#1a1207' : 'text.primary', width: 40, height: 40 }}>
                              {room.drivers?.full_name?.[0]?.toUpperCase() || 'D'}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          sx={{ display: { xs: 'none', sm: 'block' } }}
                          primary={<Typography variant="body2" fontWeight={isActive ? 700 : 500} noWrap>{room.drivers?.full_name || 'Tài xế ẩn danh'}</Typography>}
                          secondary={<Typography variant="caption" color={isActive ? 'text.primary' : 'text.secondary'} noWrap>{room.last_message || 'Chưa có tin nhắn'}</Typography>}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
                {rooms.length === 0 && <Typography variant="body2" color="text.secondary" textAlign="center" py={3} sx={{ display: { xs: 'none', sm: 'block' } }}>Chưa có cuộc trò chuyện nào.</Typography>}
              </List>
            )}
          </Box>

          {/* Right Panel - Chat Interface */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {activeRoomId ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(241,240,239,0.08)', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(26,26,36,0.8)' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', color: '#1a1207' }}>
                    {activeRoom?.drivers?.full_name?.[0]?.toUpperCase() || 'D'}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>{activeRoom?.drivers?.full_name || 'Tài xế ẩn danh'}</Typography>
                    <Typography variant="caption" sx={{ color: STATUS_CONFIG[activeRoom?.drivers?.status || 'OFFLINE'].color }}>
                      ● {activeRoom?.drivers?.status || 'OFFLINE'}
                    </Typography>
                  </Box>
                </Box>

                {/* Messages List */}
                <Box sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, bgcolor: '#0f0f14' }}>
                  {loadingMessages ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: 'primary.main' }} /></Box>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isAdmin = msg.sender_role === 'ADMIN';
                        return (
                          <Box key={msg.id || idx} className="chat-bubble" sx={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', mb: 1 }}>
                            <Box sx={{
                              maxWidth: '75%',
                              p: 1.5,
                              borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              bgcolor: isAdmin ? 'primary.main' : 'rgba(241,240,239,0.1)',
                              color: isAdmin ? '#1a1207' : 'text.primary',
                              boxShadow: isAdmin ? '0 4px 12px rgba(245,158,11,0.2)' : 'none',
                            }}>
                              <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.message_text}</Typography>
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: isAdmin ? 'right' : 'left', color: isAdmin ? 'rgba(26,18,7,0.7)' : 'text.disabled', fontSize: '0.65rem' }}>
                                {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </Box>

                {/* Chat Input */}
                <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: '1px solid rgba(241,240,239,0.08)', bgcolor: 'rgba(26,26,36,0.8)', display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Nhập tin nhắn..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    autoComplete="off"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 6,
                        bgcolor: 'background.default'
                      }
                    }}
                  />
                  <IconButton
                    type="submit"
                    disabled={!newMessage.trim()}
                    sx={{
                      bgcolor: newMessage.trim() ? 'primary.main' : 'rgba(241,240,239,0.1)',
                      color: newMessage.trim() ? '#1a1207' : 'text.disabled',
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: 40, height: 40,
                    }}
                  >
                    <SendRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled', flexDirection: 'column', gap: 2 }}>
                <ChatRoundedIcon sx={{ fontSize: 64, opacity: 0.2 }} />
                <Typography variant="body1">Chọn một cuộc trò chuyện để bắt đầu</Typography>
              </Box>
            )}
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
