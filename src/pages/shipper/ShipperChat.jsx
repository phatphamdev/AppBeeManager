import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, TextField, IconButton
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { supabase } from '../../supabaseClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ShipperChat() {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ── Init Chat Room ─────────────────────────────────────── */
  const initChat = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    // 1. Get Driver Info
    const { data: driver, error: dErr } = await supabase
      .from('drivers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (dErr) {
      setError('Lỗi lấy thông tin tài xế: ' + dErr.message);
      setLoading(false);
      return;
    }
    setDriverInfo(driver);

    // 2. Get or Create Room
    let { data: room, error: rErr } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('driver_id', driver.id)
      .single();

    if (rErr && rErr.code !== 'PGRST116') {
      setError('Lỗi tìm phòng chat: ' + rErr.message);
      setLoading(false);
      return;
    }

    if (!room) {
      const { data: newRoom, error: nrErr } = await supabase
        .from('chat_rooms')
        .insert([{ driver_id: driver.id }])
        .select()
        .single();
        
      if (nrErr) {
        setError('Lỗi tạo phòng chat: ' + nrErr.message);
        setLoading(false);
        return;
      }
      room = newRoom;
    }
    
    setRoomId(room.id);

    // 3. Load initial messages
    const { data: msgData, error: mErr } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true });
      
    if (mErr) {
      setError('Lỗi lấy tin nhắn: ' + mErr.message);
    } else {
      setMessages(msgData || []);
      // Mark as read (Shipper reading Admin messages)
      const unreadIds = msgData?.filter(m => m.sender_role === 'ADMIN' && !m.is_read).map(m => m.id) || [];
      if (unreadIds.length > 0) {
        await supabase.from('chat_messages').update({ is_read: true }).in('id', unreadIds);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { initChat(); }, [initChat]);

  /* ── Realtime Subscription ──────────────────────────────── */
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel('shipper-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
         const newMsg = payload.new;
         setMessages(prev => [...prev, newMsg]);
         if (newMsg.sender_role === 'ADMIN') {
           supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id);
         }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  /* ── Send Message ───────────────────────────────────────── */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId || !user) return;

    const text = newMessage.trim();
    setNewMessage('');
    
    const { error: err } = await supabase.from('chat_messages').insert([{
      room_id: roomId,
      sender_id: user.id,
      sender_role: 'SHIPPER',
      message_text: text,
      is_read: false
    }]);

    if (err) setError('Lỗi gửi tin: ' + err.message);
    else {
      await supabase.from('chat_rooms').update({
        last_message: text,
        last_message_at: new Date().toISOString()
      }).eq('id', roomId);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>;
  }

  return (
    <Box className="page-enter" sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      
      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
         {messages.length === 0 ? (
           <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
             Chưa có tin nhắn. Hãy gửi tin nhắn cho bộ phận điều phối.
           </Typography>
         ) : (
           messages.map((msg) => {
             const isMe = msg.sender_role === 'SHIPPER';
             return (
               <Box key={msg.id} className="chat-bubble" sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{ 
                    maxWidth: '85%', 
                    p: 1.5, 
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    bgcolor: isMe ? 'primary.main' : 'rgba(241,240,239,0.1)',
                    color: isMe ? '#1a1207' : 'text.primary',
                    boxShadow: isMe ? '0 4px 12px rgba(245,158,11,0.2)' : 'none',
                  }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.message_text}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: isMe ? 'right' : 'left', color: isMe ? 'rgba(26,18,7,0.7)' : 'text.disabled', fontSize: '0.65rem' }}>
                      {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
               </Box>
             );
           })
         )}
         <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box component="form" onSubmit={handleSendMessage} sx={{ mt: 2, display: 'flex', gap: 1 }}>
         <TextField
           fullWidth
           size="small"
           placeholder="Nhắn tin cho Điều Phối..."
           value={newMessage}
           onChange={e => setNewMessage(e.target.value)}
           sx={{ '& .MuiOutlinedInput-root': { borderRadius: 6, bgcolor: 'rgba(26,26,36,0.8)' } }}
         />
         <IconButton 
           type="submit" 
           disabled={!newMessage.trim()}
           sx={{ 
             bgcolor: newMessage.trim() ? 'primary.main' : 'rgba(241,240,239,0.1)',
             color: newMessage.trim() ? '#1a1207' : 'text.disabled',
             borderRadius: 2,
             '&:hover': { bgcolor: 'primary.dark' },
             width: 40, height: 40
           }}
         >
           <SendRoundedIcon fontSize="small" />
         </IconButton>
      </Box>
    </Box>
  );
}
