import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * useDriverInfo — Lấy thông tin tài xế từ auth_user_id hiện tại
 * Dùng trong các trang Shipper
 */
export function useDriverInfo() {
  const { user } = useAuth();
  const [driver, setDriver]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('drivers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();
    if (err) setError(err.message);
    else setDriver(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (newStatus) => {
    if (!driver) return;
    const { error: err } = await supabase
      .from('drivers')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', driver.id);
    if (err) setError(err.message);
    else setDriver(prev => ({ ...prev, status: newStatus }));
  };

  return { driver, setDriver, loading, error, updateStatus, refetch: fetch };
}

/**
 * useOrders — Lấy danh sách đơn hàng (cho Admin hoặc Shipper)
 * @param {object} options - { status, driverId, limit }
 */
export function useOrders({ status = null, driverId = null, limit = 50 } = {}) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, drivers(full_name, phone_number)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status)   query = query.eq('status', status);
    if (driverId) query = query.eq('driver_id', driverId);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setOrders(data || []);
    setLoading(false);
  }, [status, driverId, limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { orders, setOrders, loading, error, refetch: fetch };
}

/**
 * useChatRoom — Lấy hoặc tạo phòng chat cho tài xế
 * @param {number|null} driverId
 */
export function useChatRoom(driverId) {
  const [room, setRoom]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!driverId) { setLoading(false); return; }
    const init = async () => {
      setLoading(true);
      // Tìm room có sẵn
      let { data: existing, error: findErr } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('driver_id', driverId)
        .maybeSingle();

      if (findErr) { setError(findErr.message); setLoading(false); return; }

      if (!existing) {
        // Tạo room mới nếu chưa có
        const { data: created, error: createErr } = await supabase
          .from('chat_rooms')
          .insert([{ driver_id: driverId }])
          .select()
          .single();
        if (createErr) { setError(createErr.message); setLoading(false); return; }
        existing = created;
      }

      setRoom(existing);
      setLoading(false);
    };
    init();
  }, [driverId]);

  return { room, loading, error };
}
