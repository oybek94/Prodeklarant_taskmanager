-- Xodim telefoni endi tizimga kirish logini — bazada takrorlanmasligi kafolatlanadi.
-- NULL qiymatlar (telefoni kiritilmagan, faol bo'lmagan xodimlar) cheklovga tushmaydi.
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
