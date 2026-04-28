# Mắt Việt HR

Hệ thống quản lý tuyển dụng thông minh — Next.js 15 + Supabase + Gemini 2.5 Flash + Microsoft Graph.

## Yêu cầu

- Node.js **20 LTS** trở lên
- npm 10+ (hoặc pnpm)
- Tài khoản Supabase project `xeyqbapegqeibeqrwnkm` (region ap-southeast-2)
- Google Gemini API key
- Microsoft Graph App (cho hr@matviet.com.vn)

## Khởi động lần đầu

```bash
cd app
cp .env.example .env.local      # điền các secret thật
npm install
npm run dev                      # http://localhost:3000
```

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Khởi chạy dev server |
| `npm run build` | Build production |
| `npm run start` | Chạy production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript no-emit |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run db:types` | Generate types từ Supabase schema |

## Cấu trúc

- `src/app/` — Next.js App Router (route tiếng Việt)
- `src/components/` — UI components
- `src/lib/` — Supabase clients, Gemini, MS Graph, scoring, utilities
- `supabase/migrations/` — DB schema (apply qua Supabase MCP hoặc CLI)

## Tài liệu liên quan

- [PRD v2.0](../docs/PRD-v2.md)
- [Infrastructure & Assets](../docs/Infrastructure-and-Assets.md)
- Plan file: `C:\Users\thach\.claude\plans\snoopy-bubbling-hartmanis.md`

## Roles

| Role | Quyền |
|---|---|
| `admin` | Toàn quyền — Sanh Võ |
| `hr` | Đăng tin, lọc CV, xếp lịch, gửi email — chị Hương |
| `hiring_manager` | Xem CV/đánh giá phòng mình |
| `bod` | Duyệt cuối cho vị trí quản lý |
| `tap_doan` | Duyệt cấp Tập đoàn |

## Tạo admin đầu tiên

1. Vào Supabase Studio → Authentication → Users → Add user
2. Email: `matvietdesignteam@gmail.com` (hoặc admin email)
3. Verify password
4. Vào SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Sanh Võ', is_active = true
   where id = '<user-uuid>';
   ```

## Deploy

Production: Netlify, branch `main` → `hr.matviet.com.vn`.
Staging: branch `develop` → `hr-staging.matviet.com.vn`.

Set env vars trong Netlify UI (Site settings → Environment variables) theo `.env.example`.

## Vận hành

Xem `docs/runbook.md` (sẽ tạo trong Group 11):
- Rotate Azure AD secret (24 tháng)
- Restore Supabase từ PITR
- Re-deploy LibreOffice worker
- Handle Gemini quota
