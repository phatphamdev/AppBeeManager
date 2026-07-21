-- ==============================================================================
-- MIGRATION: Thêm hỗ trợ CUSTOMER role và các cột mới
-- Chạy file này trong Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Thêm CUSTOMER vào enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CUSTOMER';

-- 2. Thêm các cột mới vào bảng orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS origin_lat NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS origin_lng NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. RLS Policy cho Customer
-- Cho phép user đã đăng nhập tạo đơn hàng
DROP POLICY IF EXISTS "Allow authenticated insert orders" ON public.orders;
CREATE POLICY "Allow authenticated insert orders" ON public.orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Cho phép Customer đọc đơn của chính họ
DROP POLICY IF EXISTS "Allow customer read own orders" ON public.orders;
CREATE POLICY "Allow customer read own orders" ON public.orders
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- 4. Cho phép Customer đọc services để xem bảng giá
DROP POLICY IF EXISTS "Allow all read services" ON public.services;
CREATE POLICY "Allow all read services" ON public.services
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Cho phép Customer đọc surcharges
DROP POLICY IF EXISTS "Allow all read surcharges" ON public.surcharges;
CREATE POLICY "Allow all read surcharges" ON public.surcharges
  FOR SELECT USING (auth.role() = 'authenticated');

-- 6. Cho phép Customer insert vào user_roles (để tự đăng ký)
DROP POLICY IF EXISTS "Allow self insert role" ON public.user_roles;
CREATE POLICY "Allow self insert role" ON public.user_roles
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- ==============================================================================
-- XONG! Sau khi chạy, reload Supabase client và thử đăng ký tài khoản mới.
-- ==============================================================================
