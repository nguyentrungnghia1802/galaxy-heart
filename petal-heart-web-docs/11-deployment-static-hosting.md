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

## 2. GitHub Pages & GitHub Actions

Project được triển khai tự động lên GitHub Pages bằng GitHub Actions:

- **Workflow file**: [`.github/workflows/deploy-pages.yml`](file:///.github/workflows/deploy-pages.yml)
- **Trigger**: Tự động build và deploy khi push code vào branch `main`.
- **Manual Trigger**: Hỗ trợ chạy thủ công từ tab **Actions** → chọn **Deploy to GitHub Pages** → click **Run workflow** (`workflow_dispatch`).
- **Expected URL**: `https://nguyentrungnghia1802.github.io/galaxy-heart/`
- **Vite Base Path**: Cấu hình tự động `/galaxy-heart/` khi chạy trong GitHub Actions (`GITHUB_PAGES=true` hoặc `GITHUB_ACTIONS=true`) và `./` khi dev/preview cục bộ.
- **Repository Setting**: Cần bật GitHub Pages source:
  1. Vào repository trên GitHub: **Settings** → **Pages**
  2. Tại mục **Build and deployment** > **Source**, chọn **GitHub Actions**.
- **Kiểm tra status**: Vào tab **Actions** trên repository để theo dõi tiến trình build và deploy. Pipeline có test gate (`npm test` và `npm run build`), nếu test fail hệ thống sẽ chặn không deploy artifact lỗi.

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
