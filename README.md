# BFPS ERP Ecosystem

> **Baba Farid Public School** — Kilianwali, Punjab | ICSE/ISC Board | PU170

Enterprise-grade School ERP Ecosystem powering five integrated platforms for complete school management.

## 🏗️ Architecture

| Platform | URL | Purpose |
|----------|-----|---------|
| ERP System | `erp.bfpsedu.in` | Full school management — all modules |
| School Website | `www.bfpsedu.in` | Public site — admissions, info, gallery, blog |
| Website Admin | `admin.bfpsedu.in` | CMS — manage all website content |
| School Blog | `blog.bfpsedu.in` | Articles, events, SEO content |
| Mobile App | Android + iOS | Flutter — parents, teachers, admin roles |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Cache | Redis (Upstash) |
| Auth | NextAuth.js + JWT + bcrypt + TOTP 2FA |
| Payments | Razorpay |
| File Storage | Cloudinary |
| Email | Nodemailer (Serverbyte SMTP/IMAP) |
| WhatsApp | Twilio Programmable Messaging |
| Mobile | Flutter (Dart) |
| Push Notifications | Firebase Cloud Messaging |
| Error Tracking | Sentry |
| Testing | Playwright + Jest + Supertest |
| CI/CD | GitHub Actions |
| Deployment | Vercel (frontend) + Railway (backend) |

## 👥 User Roles (17)

`MASTER_ADMIN` · `ADMIN` · `DIRECTOR` · `PRINCIPAL` · `VICE_PRINCIPAL` · `AC_COORDINATOR` · `TEACHER` · `IT_DEPT` · `ACCOUNTS` · `RECEPTION` · `MARKETING` · `TELECALLING` · `TRANSPORT_MANAGER` · `HOSTEL_WARDEN` · `LIBRARIAN` · `STUDENT` · `PARENT`

## 📦 Core Modules (25+)

Authentication · Students · Attendance · Fees & Payments · Examinations · Staff · Leave Management · Timetable · Lead CRM · Notifications · Library · Transport · Hostel · Homework · Blog CMS · Website CMS · Gallery · Career Applications · Contact Enquiries · Analytics · Custom Reports · Visitor Management · Payroll · PTM Scheduler · Certificate Generation · and more.

## 🔐 Security

- OWASP Top 10 compliant
- RBAC middleware on every route (server-side)
- AES-256 encryption for Aadhaar and bank data
- bcrypt (12 rounds) for passwords
- JWT with 15-min access / 7-day refresh token rotation
- TOTP 2FA (mandatory for admin-level roles)
- Razorpay webhook signature verification
- Rate limiting on all endpoints
- `npm audit` on every PR — fails on critical CVEs

## 📂 Project Structure

```
student-erp-system/
├── docs/              # Specification documents (FINAL_01 through FINAL_09)
├── backend/           # Express.js API server
│   ├── prisma/        # Database schema and migrations
│   └── src/           # Controllers, routes, services, middleware, utils
├── frontend/          # Next.js 14 ERP dashboard
├── website/           # Next.js 14 public school website
├── blog/              # Next.js 14 blog platform
├── mobile/            # Flutter mobile application
└── .github/           # CI/CD workflows
```

## 🚀 API

All endpoints are prefixed with `/api/v1/`. Full API specification is documented in `docs/FINAL_05_API_Contracts_Enhanced.docx`.

## 📖 Documentation

All system specifications live in the `/docs` folder:

| Document | Contents |
|----------|----------|
| FINAL_01 | Master Execution Document — primary specification |
| FINAL_02 | Leave Management — omnichannel workflow |
| FINAL_03 | Career & Contact — deduplication logic |
| FINAL_04 | ERD — all 38 database models |
| FINAL_05 | API Contracts — all REST endpoints |
| FINAL_06 | UI Wireframes — all screens |
| FINAL_07 | Social Media Handles & Strategy |
| FINAL_08 | School Pamphlet (PDF) |
| FINAL_09 | Ultimate Master — ecosystem overview |

## 🏫 About

**Baba Farid Public School (BFPS)** is an ICSE/ISC Board school in Kilianwali, Punjab, India.

- **Vision**: Empowering Education to Discover the Universe
- **Tagline**: Join & Grow With Us
- **Contact**: 93152-00786 | 93159-00786
- **Domain**: [bfpsedu.in](https://bfpsedu.in)

## 📜 License

Private repository. All rights reserved. © 2026 Baba Farid Public School.
