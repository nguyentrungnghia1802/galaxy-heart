# 11 — Deployment & Static Hosting

## 1. Build model

Development dùng Vite, production output là static files.

Expected commands:

```bash
npm install
npm run dev
npm run build
npm run preview
```

`npm run build` tạo `dist/`.

## 2. GitHub Pages

Nếu deploy dưới subpath repository, cấu hình Vite `base` phù hợp. Asset URL phải tương đối/base-aware, không hard-code `/assets/...` nếu site nằm dưới `/repo-name/`.

## 3. Netlify/Vercel

- build command: `npm run build`;
- publish/output directory: `dist`.

Không cần server function.

## 4. Cache

Hash assets từ Vite cho phép cache dài. `index.html` nên revalidate ngắn hơn bundle hashed.

## 5. Compression

Static host nên phục vụ Brotli/gzip tự động. Texture nên được tối ưu trước khi build.

## 6. Asset budget

Mục tiêu V1:

- initial HTML/CSS/JS đủ nhỏ để load nhanh;
- petal texture/model tối ưu;
- không ship video 4K chỉ để làm background;
- tổng tải first experience cố gắng dưới vài MB nếu có thể.

## 7. HTTPS

WebGL không bắt buộc HTTPS trong mọi trường hợp nhưng production phải dùng HTTPS. Các static host nêu trên hỗ trợ HTTPS.

## 8. Error monitoring

V1 không bắt buộc dịch vụ monitoring. Ít nhất giữ logging dev rõ ràng và production không spam console.
