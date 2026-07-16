# Storage Migration Plan — Local FS → Supabase Storage

## Estado actual

- Las imágenes de vendor (`vendors.photo_url`) y producto (`products.photo_url`, `product_photos.url`)
  se sirven como rutas locales: `/storage/<file>` → `apps/web/public/storage/<file>`.
- Ventaja: cero dependencias externas, baja latencia.
- Riesgo: el VPS es single-p...