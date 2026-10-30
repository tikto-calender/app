# TikTo App

Web app độc lập, tối giản, không cần framework hoặc database ngoài. App cung cấp UI và JSON API cho task/calendar; dữ liệu được lưu trong `data/store.json`.

Đây là một source/repository riêng. Notification được đặt trong source `TikTo-Notification-Service` và hiện chưa được nối vào app.

## Chạy local

Yêu cầu Node.js 22 trở lên.

```bash
npm start
```

Mở `http://localhost:3000`.

Có thể đổi port bằng biến môi trường `PORT`.

Chế độ tự reload server:

```bash
npm run dev
```

## API

- `GET /api/health`
- `GET /api/overview`
- `GET|POST /api/tasks`
- `PATCH|DELETE /api/tasks/:id`
- `GET|POST /api/events`
- `PATCH|DELETE /api/events/:id`

File JSON chỉ phù hợp local, demo và một process. Khi phát triển tiếp, thay module `src/store.mjs` bằng PostgreSQL mà không cần đổi giao diện API.
