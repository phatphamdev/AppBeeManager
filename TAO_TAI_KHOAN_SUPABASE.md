# Hướng Dẫn Tạo Tài Khoản (Admin & Shipper) Trên Supabase

Vì **BeeShip** là hệ thống quản trị nội bộ (Internal Management System), chức năng "Đăng ký" (Sign Up) không được mở công khai trên giao diện web để đảm bảo tính bảo mật. Thay vào đó, tài khoản mới phải được tạo trực tiếp bởi Quản trị viên (Super Admin) thông qua giao diện của Supabase.

Dưới đây là 2 cách để tạo tài khoản mới:

---

## CÁCH 1: TẠO BẰNG GIAO DIỆN SUPABASE (Khuyên dùng cho người không rành SQL)

### Bước 1: Tạo tài khoản xác thực (Auth)
1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com/).
2. Chọn dự án **BeeShip** của bạn.
3. Ở menu bên trái, chọn mục **Authentication** (biểu tượng 2 hình người).
4. Nhấn vào nút **Add User** -> Chọn **Create new user**.
5. Nhập **Email** và **Mật khẩu** cho nhân viên mới. (Tick chọn *Auto Confirm User* nếu có).
6. Nhấn **Create User**.
7. Sau khi tạo xong, tài khoản sẽ xuất hiện trong danh sách. Hãy **Copy đoạn mã UUID** (chuỗi dài ký tự) ở cột `UID` của người dùng vừa tạo.

### Bước 2: Phân quyền (Gán Role)
Tài khoản vừa tạo chỉ mới có thể đăng nhập, nhưng chưa có quyền truy cập vào Admin hay Shipper portal. Bạn cần cấp quyền cho tài khoản đó:
1. Ở menu bên trái, chọn mục **Table Editor** (biểu tượng bảng biểu).
2. Chọn bảng `user_roles`.
3. Nhấn **Insert Row**.
4. Dán đoạn mã UID vừa copy ở Bước 1 vào cột `auth_user_id`.
5. Ở cột `role`, chọn `ADMIN` (nếu là nhân viên điều phối) hoặc `SHIPPER` (nếu là tài xế giao hàng).
6. Nhấn **Save**.

*(Nếu tạo tài khoản ADMIN, đến đây là hoàn tất. Nếu tạo tài khoản SHIPPER, hãy làm tiếp Bước 3).*

### Bước 3: Tạo hồ sơ Tài xế (Chỉ dành cho SHIPPER)
Shipper cần có hồ sơ tài xế để nhận đơn và định vị.
1. Vẫn ở trong **Table Editor**, chọn bảng `drivers`.
2. Nhấn **Insert Row**.
3. Điền thông tin:
   - `auth_user_id`: Dán UID đã copy ở Bước 1.
   - `full_name`: Tên đầy đủ của tài xế (VD: Nguyễn Văn A).
   - `phone_number`: Số điện thoại liên hệ (VD: 0901234567).
   - `status`: Giữ nguyên `OFFLINE`.
4. Nhấn **Save**.

✅ **Hoàn tất!** Nhân viên hiện có thể đăng nhập bằng Email/Password vừa tạo.

---

## CÁCH 2: TẠO NHANH BẰNG SQL SCRIPT (Nâng cao)

Nếu bạn cần tạo nhiều tài khoản cùng lúc, bạn có thể chạy đoạn SQL sau trong mục **SQL Editor** của Supabase.

> ⚠️ **Lưu ý:** Đoạn mã này sử dụng extension `pgcrypto` để mã hóa mật khẩu. Supabase hỗ trợ mặc định chức năng này.

### Script tạo SHIPPER mẫu:
```sql
DO $$
DECLARE
  new_uid UUID := gen_random_uuid(); -- Tự động tạo ID mới
  new_email TEXT := 'shipper2@beeship.com';
  new_pass TEXT := '123456';
  driver_name TEXT := 'Nguyễn Văn B';
  driver_phone TEXT := '0909888777';
BEGIN
  -- 1. Tạo tài khoản đăng nhập
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (new_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', new_email, crypt(new_pass, gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', '{}', now(), now());

  -- 2. Gán quyền SHIPPER
  INSERT INTO public.user_roles (auth_user_id, role)
  VALUES (new_uid, 'SHIPPER');

  -- 3. Tạo hồ sơ tài xế
  INSERT INTO public.drivers (auth_user_id, full_name, phone_number, status)
  VALUES (new_uid, driver_name, driver_phone, 'OFFLINE');
END $$;
```

### Script tạo ADMIN mẫu:
```sql
DO $$
DECLARE
  new_uid UUID := gen_random_uuid();
  new_email TEXT := 'admin2@beeship.com';
  new_pass TEXT := '123456';
BEGIN
  -- 1. Tạo tài khoản đăng nhập
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (new_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', new_email, crypt(new_pass, gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', '{}', now(), now());

  -- 2. Gán quyền ADMIN
  INSERT INTO public.user_roles (auth_user_id, role)
  VALUES (new_uid, 'ADMIN');
END $$;
```
