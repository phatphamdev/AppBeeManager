import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient.js';

/**
 * useRealtimeTable — Hook lắng nghe Supabase Realtime cho 1 bảng
 *
 * @param {string} table - Tên bảng cần lắng nghe
 * @param {function} onInsert - Callback khi có row mới
 * @param {function} onUpdate - Callback khi row được cập nhật
 * @param {function} onDelete - Callback khi row bị xóa
 * @param {string} filter - Tùy chọn filter kiểu "column=eq.value"
 */
export function useRealtimeTable({ table, onInsert, onUpdate, onDelete, filter = null }) {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);

  useEffect(() => { onInsertRef.current = onInsert; }, [onInsert]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);

  useEffect(() => {
    const channelName = `rt-${table}-${Date.now()}`;
    const config = { event: '*', schema: 'public', table };
    if (filter) config.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config, (payload) => {
        if (payload.eventType === 'INSERT' && onInsertRef.current) onInsertRef.current(payload.new, payload);
        if (payload.eventType === 'UPDATE' && onUpdateRef.current) onUpdateRef.current(payload.new, payload);
        if (payload.eventType === 'DELETE' && onDeleteRef.current) onDeleteRef.current(payload.old, payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, filter]);
}

/**
 * useRealtimeMessages — Hook chuyên biệt cho chat_messages theo room_id
 *
 * @param {string|null} roomId - ID phòng chat
 * @param {function} onNewMessage - Callback nhận tin nhắn mới
 */
export function useRealtimeMessages(roomId, onNewMessage) {
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`messages-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        if (onNewMessageRef.current) onNewMessageRef.current(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);
}
