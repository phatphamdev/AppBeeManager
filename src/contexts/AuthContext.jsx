import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

const AuthContext = createContext(null);

/**
 * Hook để lấy thông tin user hiện tại, role và hàm signOut.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
}

/**
 * AuthProvider — bao bọc toàn bộ app.
 * Lắng nghe Supabase Auth session và fetch role từ bảng user_roles.
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);   // 'ADMIN' | 'SHIPPER' | 'CUSTOMER' | null
  const [loading, setLoading] = useState(true);

  /* ── Fetch role từ bảng user_roles ──────────────────────── */
  const fetchRole = async (userId) => {
    if (!userId) { setRole(null); return; }
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('auth_user_id', userId)
      .single();
    if (error) {
      console.warn('Không lấy được role:', error.message);
      setRole(null);
    } else {
      setRole(data?.role || null);
    }
  };

  /* ── Lắng nghe session thay đổi ─────────────────────────── */
  useEffect(() => {
    // Lấy session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      fetchRole(session?.user?.id).finally(() => setLoading(false));
    });

    // Subscribe thay đổi auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchRole(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sign out ────────────────────────────────────────────── */
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
