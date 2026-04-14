__BABA FARID PUBLIC SCHOOL__

Kilianwali, Punjab | ICSE/ISC | PU170 | bfpsedu\.in

__BFPS ERP ECOSYSTEM__

__Master Execution Document for Anti\-Gravity__

FINAL\_01 Version 3\.1 | April 2026 | Compatible with Claude Opus 4\.6 and Sonnet 4\.6

__This is the primary document\. Anti\-Gravity reads this first before any other file\.__

# __SECTION 0: INSTRUCTIONS FOR THE AI SYSTEM \(ANTI\-GRAVITY\)__

__You are Anti\-Gravity\. You are about to build the BFPS School ERP Ecosystem\.__

You are working for Baba Farid Public School in Kilianwali, Punjab\.

The system owner is Rishik Kumar Chaurasiya, the IT Head and Master Admin\.

Read every section of this document before writing a single line of code\.

Also read every other file in the docs folder before starting\.

After reading everything, confirm your understanding by summarizing:

\- How many platforms are being built

\- How many user roles exist

\- What the API version prefix is

\- What the Master Admin email is \(hardcoded\)

\- What the blog automation webhook endpoint is

\- What the deployment strategy is \(free tiers\)

Only after that confirmation, begin Task 1\.1\.1 from Section 12\.

Quality standard: Write code as a senior engineer with 10 years of production experience\.

No placeholder logic\. No TODO comments\. No shortcuts\. Every feature fully implemented\.

This system handles student data and payment transactions\. It must not fail\.

# __SECTION 1: DEVOPS PIPELINE \-\- ZERO EXCEPTIONS__

## __1\.1 The Atomic Commit Rule__

__Every single file operation triggers an immediate Git sequence\.__

A file operation means creating a file, changing a file, or deleting a file\.

The moment any file operation finishes, run these three commands:

git add \[the specific file path \-\- nothing else\]

git commit \-m "type\(scope\): what changed in this specific file"

git push origin feature/\[branch\-name\]

One file equals one commit equals one push\. No exceptions\. Never batch files together\.

If 1000 files are created during this project, that produces 1000 commits\.

On the Personal Laptop, push to both remotes after every file:

git push origin feature/\[branch\]    \-\- school account \(bfps\-school\)

git push personal feature/\[branch\]  \-\- rishikkumar84a account

## __1\.2 Full Pipeline for Every File__

Step 1:  Create or change the file

Step 2:  git add \[file\] \+ git commit \+ git push to feature branch

Step 3:  Create Pull Request using GitHub MCP

         Title: \[TASK X\.X\.X\] type\(scope\): short description

         Base branch: main | Head branch: feature/\[task\-id\]\-\[short\-description\]

Step 4:  Linter MCP runs on the PR automatically

         JavaScript and TypeScript: ESLint with Airbnb config

         CSS and Tailwind: Stylelint

         Python: PyLint

         Dart and Flutter: dart analyze

         If errors are found: fix the file, push the fix, linter runs again

         Keep fixing until lint passes with zero errors

Step 5:  Playwright MCP runs tests on the PR

         Component tests for UI files

         API integration tests via Supertest for backend files

         End\-to\-end tests for critical flows where applicable

         If tests fail: fix the file, push the fix, tests run again

         Keep fixing until all tests pass

Step 6:  GitHub Copilot reviews the PR

         Copilot checks for logic errors, security issues, best practices

         If Copilot requests changes: apply them, push, restart from Step 4

Step 7:  Auto\-merge when all conditions are met

         Lint: pass | Tests: pass | Copilot: approved

         Branch is deleted after merge

## __1\.3 Branch Naming__

feature/1\-1\-1\-init\-repo

feature/5\-1\-3\-student\-model

feature/10\-1\-attendance\-api

fix/12\-2\-fee\-balance\-bug

hotfix/20\-1\-payment\-webhook

## __1\.4 Commit Message Format__

Types: feat, fix, chore, docs, test, refactor, perf, security, db

Format: type\(scope\): short description under 72 characters

Examples:

  feat\(auth\): add JWT refresh token rotation

  fix\(fees\): correct partial payment balance calculation

  security\(api\): add rate limiting to login endpoint

  perf\(db\): add composite index on attendance date and class

  db\(schema\): add unified leave request model

## __1\.5 MCP Assignments__

__MCP Tool__

__Handles__

__Does Not Handle__

GitHub MCP

All git operations: branch create, file write, commit, push, PR create, PR merge

Database, tests, linting

Database MCP

All Prisma operations: generate, migrate, seed, studio queries via Supabase

Git, tests, file creation

Playwright MCP

UI component tests, API integration tests, end\-to\-end critical flow tests

Git, linting, database

Linter MCP

ESLint, Stylelint, PyLint, dart analyze on every PR file

Git, tests, database

## __1\.6 Status Report Format__

After every task, report in this exact format:

STATUS  : DONE

TASK    : X\.X\.X \-\- task name

FILE    : exact file path

BRANCH  : feature/branch\-name

COMMIT  : commit hash

LINT    : PASS

TESTS   : PASS

COPILOT : APPROVED

PR      : MERGED

NEXT    : X\.X\.X\+1 \-\- next task name

# __SECTION 2: SYSTEM ARCHITECTURE__

## __2\.1 Four Platforms__

__Platform__

__URL__

__Purpose__

ERP System

erp\.bfpsedu\.in

Full school management\. Every module\. Admin\-controlled\.

School Website

www\.bfpsedu\.in

Public site\. Admissions, info, gallery, careers, blog, contact\.

Website Admin Panel

admin\.bfpsedu\.in

Lets admin update every part of the website without code\.

School Blog

blog\.bfpsedu\.in

Articles, events, SEO content\. Auto\-post webhook ready\.

Mobile App

Android and iOS

Teacher, Admin, Student, Parent roles via Flutter\.

## __2\.2 Technology Stack__

__Layer__

__Technology__

__Notes__

Frontend

Next\.js 14 App Router with TypeScript

Strict TypeScript\. No 'any' types allowed\.

Styling

Tailwind CSS with shadcn/ui components

BFPS brand colors in tailwind\.config\.ts

Backend

Node\.js with Express\.js

All routes prefixed /api/v1/ for versioning

ORM

Prisma

Strict schema\. Migrations only via Database MCP\.

Database

PostgreSQL on Supabase free tier

Migrate to paid when school approves budget

Cache

Redis on Upstash free tier

Session data, rate limiting, frequently\-read CMS content

Authentication

NextAuth\.js with JWT and bcrypt

Access token: 15 minutes\. Refresh: 7 days\. Token rotation on\.

File Storage

Cloudinary free tier

Photos, PDFs, resumes, gallery, staff images

Email Sending

Nodemailer via Serverbyte SMTP

Sender: noreply@bfpsedu\.in for all auto emails

Email Reading

imap\-simple via Serverbyte IMAP

Reads leave@, careers@, info@ inboxes

WhatsApp

Twilio Programmable Messaging

Parent alerts, fee reminders, lead follow\-ups

Payments

Razorpay

Fee collection\. PCI\-compliant\. Webhook verified\.

Mobile

Flutter with Dart

Null\-safe Dart\. One codebase for Android and iOS\.

Push Notifications

Firebase Cloud Messaging

Real\-time alerts to mobile app

Deployment \(Frontend\)

Vercel free tier

Auto\-deploys on GitHub merge\. Free SSL\. Custom domains\.

Deployment \(Backend\)

Railway free tier

Node\.js API\. 500 hours/month free\.

Error Tracking

Sentry free tier

Captures all unhandled errors\. Alerts via email\.

Logging

Winston with Morgan

Structured JSON logs\. Levels: error, warn, info, debug\.

Testing \(E2E\)

Playwright

Runs on every PR via Playwright MCP\.

Testing \(Unit/API\)

Jest with Supertest

Minimum 80 percent code coverage required\.

Code Review

GitHub Copilot

Auto\-reviewer on every PR\.

Linting

ESLint Airbnb config, Prettier, Stylelint

Zero lint errors required before merge\.

Version Control

GitHub private repository

Atomic commits\. PR\-only merges to main branch\.

CI/CD

GitHub Actions free tier

Auto lint, test, build, deploy on every PR merge\.

API Documentation

Swagger with OpenAPI 3\.0

Available at /api/v1/docs for Admin and IT roles\.

Security

Helmet\.js, express\-rate\-limit, CORS

OWASP Top 10 compliance is mandatory\.

## __2\.3 System Communication__

Website \(www\.bfpsedu\.in\)

  Admission form   \-> POST /api/v1/leads       \-> ERP database \+ WhatsApp to parent

  Contact form     \-> POST /api/v1/contact     \-> ERP database \+ auto\-reply email

  Career form      \-> POST /api/v1/career\-applications \-> ERP database \+ Cloudinary

  Gallery display  \-> GET  /api/v1/gallery     \-> Cloudinary CDN

  Staff section    \-> GET  /api/v1/staff?website=true \-> ERP database

  All CMS content  \-> GET  /api/v1/cms/\*       \-> ERP database key\-value store

ERP \(erp\.bfpsedu\.in\)

  All school data lives here in PostgreSQL on Supabase

  Email via Serverbyte SMTP \(noreply@bfpsedu\.in\)

  IMAP reads: leave@, careers@, info@ every 5\-10 minutes via cron jobs

  WhatsApp via Twilio

  Payments via Razorpay

  Push notifications via Firebase FCM

Mobile App

  All data through /api/v1/\* endpoints

  Push notifications through Firebase FCM

  In\-app payments through Razorpay Flutter SDK

Blog \(blog\.bfpsedu\.in\)

  Posts from ERP blog management module

  Auto\-publish webhook at POST /api/v1/blog/auto\-publish \(future connection\)

## __2\.4 Scalability Rules__

__These are mandatory\. Every endpoint and every model must follow them\.__

DATABASE RULES:

  All foreign key columns must have indexes

  Composite indexes on: attendance \(studentId\+date\), fees \(studentId\+academicYear\)

  All list endpoints must have pagination: default 50 records, max 200

  No query without a LIMIT clause anywhere in the codebase

  Prisma connection pool size: 10

CACHING RULES \(Upstash Redis\):

  CMS content: cache for 10 minutes after first fetch

  Class list and section list: cache for 60 minutes

  Staff list for website: cache for 30 minutes

  Fee structure per class: cache for 24 hours

  Invalidate relevant cache when admin updates that data

RATE LIMITING:

  Public endpoints \(forms\): 10 requests per minute per IP

  Login endpoint: 5 attempts per 15 minutes per IP

  Authenticated users: 200 requests per minute per user

  File uploads: 20 per hour per user

  Exports: 5 per minute per user

PAYMENT RULES:

  Razorpay: always create order server\-side, payment happens client\-side

  Verify webhook signature on every payment callback

  Use idempotency keys on all order creation requests

  Daily reconciliation job at 2am: cross\-check Razorpay vs database

  Failed payment retry with exponential backoff

# __SECTION 3: SECURITY REQUIREMENTS__

__Security is not optional\. Every item below is mandatory\.__

## __3\.1 OWASP Top 10 Compliance__

__Risk__

__What to Implement__

Broken Access Control

RBAC middleware on every route\. Role check server\-side always\. Never trust client role\.

Cryptographic Failures

bcrypt with 12 rounds for passwords\. AES\-256 for Aadhaar and bank numbers\. HTTPS everywhere\.

Injection

Prisma ORM blocks SQL injection\. Validate all inputs with Zod schemas\. Sanitize HTML\.

Insecure Design

API versioning at /api/v1/\. Zod validation on all endpoints\. Never expose password hash in responses\.

Security Misconfiguration

Helmet\.js on all routes\. No stack traces in production\. Env vars only in \.env file\. No secrets in code\.

Vulnerable Components

npm audit on every PR via GitHub Actions\. Fail build on critical CVEs\.

Auth Failures

Rate limit on login\. Lock after 5 failed attempts\. JWT rotation\. Secure httpOnly cookies\.

Data Integrity

Verify Razorpay webhook signatures\. Signed JWT tokens\. Prisma schema constraints enforced\.

Logging Failures

Winston structured logs\. All auth events logged\. All payment events logged\. Sentry active\.

SSRF

Whitelist allowed external domains\. Never fetch user\-provided URLs directly\.

## __3\.2 Sensitive Data__

Fields encrypted with AES\-256 before storing in database:

  Student\.aadhaarNumber

  Staff\.aadhaarNumber

  Staff\.bankAccountNumber

  Staff\.panNumber

Encryption key stored ONLY in environment variable ENCRYPTION\_KEY

Never log these fields\. Never return them in full in API responses\.

Display pattern: XXXX\-XXXX\-1234 for Aadhaar in any UI

## __3\.3 Two\-Factor Authentication__

Mandatory for: MASTER\_ADMIN, DIRECTOR, PRINCIPAL, ACCOUNTS, IT\_DEPT

Optional for: VICE\_PRINCIPAL, AC\_COORDINATOR, HOSTEL\_WARDEN, LIBRARIAN, TRANSPORT\_MANAGER

Not required for: TEACHER, RECEPTION, MARKETING, TELECALLING, STUDENT, PARENT

Implementation: TOTP via Google Authenticator \(RFC 6238\)

Backup codes: generate 8 single\-use backup codes on 2FA setup

# __SECTION 4: MASTER ADMIN AND ROLE SYSTEM__

## __4\.1 Two\-Tier Admin System__

TIER 1 \-\- MASTER ADMIN \(superadmin@bfpsedu\.in\)

  This email is hardcoded in the database seed file

  It cannot be deleted, demoted, or changed from inside the ERP

  To change it, a developer must edit seed\.js and redeploy

  This account does not appear in the user list for any other role

  Exclusive capabilities \(only this role\):

    Assign or change roles for any user

    Edit permission sets for any role in Settings > Role Management

    Create or delete Admin accounts

    Access Settings > System Configuration

    Override any approval in any module at any stage

TIER 2 \-\- ADMIN \(created by Master Admin\)

  Multiple Admin accounts can exist

  Cannot access Settings > Role Management

  Cannot assign roles to users

  Cannot create or delete other Admin accounts

  Cannot see the superadmin account anywhere in the system

  Has full access to all operational modules

## __4\.2 Role Permissions__

__Legend: FULL means full access\. VIEW means view only\. OWN means own records only\. NONE means no access\.__

These are system defaults\. Master Admin can edit any role's permissions from Settings\.

__Feature__

__Mstr__

__Admin__

__Dir__

__Prin__

__VP__

__AC__

__Tchr__

__IT__

__Accts__

__Recep__

__Mktg__

__Telecall__

__Trans__

__Hostel__

__Lib__

__Stu/Par__

System Config

FULL

NONE

NONE

NONE

NONE

NONE

NONE

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Role Management

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

User Accounts

FULL

FULL

NONE

NONE

NONE

NONE

NONE

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Students View

FULL

FULL

FULL

FULL

FULL

FULL

FULL

VIEW

VIEW

VIEW

NONE

NONE

NONE

NONE

VIEW

OWN

Students Edit

FULL

FULL

VIEW

FULL

FULL

NONE

NONE

NONE

NONE

FULL

NONE

NONE

NONE

NONE

NONE

NONE

Attendance Mark

FULL

FULL

NONE

NONE

NONE

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Attendance View

FULL

FULL

FULL

FULL

FULL

FULL

VIEW

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

OWN

Fee Config

FULL

FULL

FULL

NONE

NONE

NONE

NONE

NONE

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Fee Collection

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

Fee Reports

FULL

FULL

FULL

FULL

NONE

NONE

NONE

NONE

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Exam Schedule

FULL

FULL

NONE

FULL

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Marks Entry

FULL

FULL

NONE

NONE

NONE

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Report Card

FULL

FULL

FULL

FULL

FULL

FULL

VIEW

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

OWN

Staff Records

FULL

FULL

FULL

FULL

FULL

VIEW

OWN

FULL

VIEW

NONE

NONE

NONE

NONE

OWN

OWN

NONE

Leave L1 Approve

FULL

FULL

NONE

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Leave L2 Approve

FULL

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Timetable

FULL

FULL

NONE

FULL

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Lead CRM View

FULL

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

FULL

FULL

FULL

NONE

NONE

NONE

NONE

Lead CRM Edit

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

FULL

FULL

FULL

NONE

NONE

NONE

NONE

Notifications All

FULL

FULL

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Website CMS

FULL

FULL

NONE

NONE

NONE

NONE

NONE

FULL

NONE

NONE

FULL

NONE

NONE

NONE

NONE

NONE

Transport Module

FULL

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

FULL

NONE

NONE

NONE

Hostel Module

FULL

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

FULL

NONE

NONE

Library Module

FULL

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

FULL

NONE

Import/Export

FULL

FULL

FULL

FULL

VIEW

VIEW

VIEW

FULL

FULL

VIEW

NONE

NONE

NONE

NONE

NONE

NONE

Audit Logs

FULL

FULL

FULL

NONE

NONE

NONE

NONE

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

Analytics

FULL

FULL

FULL

FULL

VIEW

VIEW

VIEW

VIEW

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

System Health

FULL

NONE

NONE

NONE

NONE

NONE

NONE

FULL

NONE

NONE

NONE

NONE

NONE

NONE

NONE

NONE

# __SECTION 5: ERP MODULES__

__Module__

__API Prefix__

__Key Features__

Authentication

auth

15\+ roles, JWT, 2FA TOTP, session tracking, refresh token rotation

Student Management

students

Full profiles, photo, bulk import CSV/XLSX/TXT/DOCX, ID card PDF, academic journey tracker

Attendance

attendance

Period\-wise marking, WhatsApp on absent, monthly reports, 75% threshold alerts, biometric\-ready

Fee Management

fees

Fee structure, Razorpay, concessions, receipts PDF, defaulter list, bulk WhatsApp, daily reconciliation

Examination

exams

Schedule, marks entry, ICSE grading, report cards PDF, rank lists, board exam tracking

Staff Management

staff

Profiles, subject mapping, salary fields, appraisal, website toggle, offboarding flow

Leave Management

leaves

Email plus app channels, duplicate merge, Principal then Director approval, auto\-notify \(see FINAL\_02\)

Timetable

timetable

Auto\-generation, conflict detection, substitution management on leave approval, PDF export

Lead CRM

leads

Kanban pipeline, source tracking, telecalling dashboard, WhatsApp auto\-message, conversion analytics

Notifications

notifications

WhatsApp, Email, SMS, Push notification\. Broadcast, class\-specific, role\-specific\. EN and HI templates\.

Library

library

Book catalog, issue and return, overdue fines auto\-linked to fee module, availability search

Transport

transport

Routes, stops, vehicles, drivers, student\-route mapping, GPS\-ready endpoints, transport fees

Hostel

hostel

Room allocation, warden assignment, hostel attendance, hostel fees, check\-in/check\-out tracking

Homework

homework

Teacher posts with attachments, student views and submits, marks and feedback from teacher

Blog CMS

blog\-posts

Rich text editor, categories, tags, SEO meta, auto\-publish webhook ready for external automation

Website CMS

cms

All website content: sliders, about, programs, gallery, testimonials, stats, announcements

Gallery

gallery

Event folders, Cloudinary upload, category display, website sync, lightbox support

Career Applications

career\-applications

Job postings, form plus email channels with dedup \(see FINAL\_03\), resume Cloudinary, status tracking

Contact Enquiries

contact

Form plus email channels with dedup \(see FINAL\_03\), admin reply, resolution tracking

Analytics

analytics

Attendance trends, fee collection charts, lead funnel, exam performance dashboards

Custom Reports

reports

Build any report: select fields, filters, date range, group by, export PDF/XLSX/CSV/DOCX, schedule

Student Journey

students/:id/journey

Full timeline: admission to current, attendance by year, exam progress, fee history, awards

Fee Concessions

fees/concessions

Sibling discount, merit, staff ward, need\-based\. Approval required\. Report exportable\.

Academic Year

academic\-year

Year creation, student promotion workflow, alumni conversion for Class 12 graduates

Visitor Management

visitors

Reception logs visitor, notifies staff, generates visitor pass PDF

Substitution

timetable/substitutions

Auto\-triggered on leave approval: suggests available teachers, notifies substitute and students

Audit Logs

audit

Every action logged: user, action, table, old value, new value, IP, timestamp

Payment Reconciliation

payments/reconcile

Daily at 2am: cross\-check Razorpay records vs database\. Alert on any discrepancy\.

System Health

health

Pings: database, Redis, SMTP, Cloudinary, Razorpay, Firebase\. Returns status of all services\.

AI Chatbot

chatbot

FAQ management for website chatbot and WhatsApp bot\. Admin configures questions and answers\.

PWA Config

\-\-

Service worker, manifest, offline shell\. ERP installable as app on phone\.

Multi\-Language

\-\-

All parent\-facing WhatsApp and SMS in English and Hindi based on parent language preference\.

# __SECTION 6: IMPORT AND EXPORT RULES__

__Import: the system accepts these file formats for all data imports:__

CSV \-\- comma\-separated values

XLSX \-\- Microsoft Excel \(modern format\)

XLS \-\- Microsoft Excel \(legacy format\)

DOCX \-\- Microsoft Word \(for text content such as notices and blog posts\)

TXT \-\- plain text files

PDF \-\- for document uploads such as resumes, certificates, transfer certificates

__Export: every data table and report must be exportable in these formats:__

PDF \-\- official documents: report cards, fee receipts, ID cards, attendance reports

DOCX \-\- editable documents: notices, letters, staff reports

XLSX \-\- data tables: student lists, fee reports, attendance sheets, mark sheets

CSV \-\- raw data compatible with any third\-party system

Export must work on: student list, attendance reports, fee reports, exam results, staff directory, lead reports, timetable\.

# __SECTION 7: WEBSITE SPECIFICATION__

## __7\.1 Dummy\-First Build Approach__

__Build the complete structure with placeholder content first\.__

Every text field on the website pulls from the ERP CMS database\.

When school provides real content, admin updates it via admin\.bfpsedu\.in\.

No hardcoded content anywhere\. Every word is CMS\-driven\.

## __7\.2 Website Pages__

__Page__

__URL__

__Key Sections__

Home

/

Hero slider, About preview, Why Choose BFPS, Programs, Stats, Testimonials, Gallery preview, Blog preview, Admission CTA, Social media links, Footer

About

/about

Full About, Vision, Mission, Core Values, School history, Management message

Academics

/academics

Tabs: Primary, Middle, Secondary, Senior Secondary\. Streams for 11\-12\.

Programs

/programs

Robotics, German, NEET and JEE, Sports, Computer Lab, Music and Art

Faculty

/faculty

All staff with website toggle on\. Photo, name, designation, bio\.

Facilities

/facilities

Computer Lab, Robotics Lab, Library, Sports, Hostel, Transport, Science Lab

Admissions

/admissions

Process steps, eligibility, fee overview, online enquiry form

Gallery

/gallery

Event category filter, photo grid, lightbox

Blog

/blog

Post list, category filter, search, pagination

Blog Post

/blog/\[slug\]

Full post, SEO tags, share buttons, related posts

Careers

/careers

Active job listings, application form with resume upload

Contact

/contact

Google Maps embed, address, phone, contact form

Privacy Policy

/privacy

DPDP Act 2023 compliance, data usage policy

Terms

/terms

Website usage terms

## __7\.3 Form Data Flow \(No Data Gets Lost\)__

__Form__

__Endpoint__

__Stored In__

__Auto Actions on Submit__

Admission Enquiry

/api/v1/leads

leads table

WhatsApp to parent, email confirmation to parent, push to Admin mobile, lead appears in ERP CRM

Contact Form

/api/v1/contact

contact\_enquiries table

Auto\-reply email to sender, alert to admin@bfpsedu\.in, dedup check runs

Career Application

/api/v1/career\-applications

career\_applications table

Resume to Cloudinary, auto\-reply to applicant, alert to careers@bfpsedu\.in, dedup check runs

Blog Newsletter

newsletter endpoint

newsletter\_emails table

Welcome email to subscriber

## __7\.4 Blog Automation Hook__

__The blog has an auto\-publish endpoint ready from day one\.__

When the external automation tool is connected later, it posts to this endpoint:

POST /api/v1/blog/auto\-publish

Authentication: X\-Blog\-Automation\-Key header \(API key, not JWT\)

Rate limit: 10 posts per hour per API key

Body fields: title, content, category, tags, excerpt, featuredImage, seoTitle, seoDescription, autoPostSource

On success: post is created and published immediately on blog\.bfpsedu\.in

On auth failure: 401 returned, post not created

# __SECTION 8: EMAIL CONFIGURATION__

__Only these emails are hardcoded in the system\. All others are added by Master Admin later\.__

__Email__

__Status__

__System Role__

superadmin@bfpsedu\.in

Hardcoded in seed

Master Admin ERP login\. Cannot be changed from inside ERP\.

noreply@bfpsedu\.in

Hardcoded in config

Sends all automated emails\. SMTP only\.

leave@bfpsedu\.in

Hardcoded in config

Teachers send leave requests here\. IMAP read every 5 minutes\.

careers@bfpsedu\.in

Hardcoded in config

Career application emails\. IMAP read every 10 minutes\.

info@bfpsedu\.in

Hardcoded in config

General contact emails\. IMAP read every 10 minutes\.

admin@bfpsedu\.in

Hardcoded in config

System sends admin alerts here\. Not IMAP\.

system@bfpsedu\.in

Hardcoded in config

CI/CD alerts, Sentry errors, deployment reports\.

All other emails

Not set yet

Added by Master Admin in ERP Settings after staff is hired\.

## __8\.1 IMAP Cron Schedule__

__Inbox__

__Cron Schedule__

__Service File__

leave@bfpsedu\.in

Every 5 minutes: \*/5 \* \* \* \*

leave\.email\.cron\.js

careers@bfpsedu\.in

Every 10 minutes: \*/10 \* \* \* \*

career\.email\.cron\.js

info@bfpsedu\.in

Every 10 minutes: \*/10 \* \* \* \*

contact\.email\.cron\.js

# __SECTION 9: MISSING FEATURES ADDED BY CTO REVIEW__

__These features were identified as critical for a complete school ERP and added by CTO\-level review\.__

## __9\.1 Student Disciplinary Records__

Track: warnings, suspensions, conduct notes per student

Who can add: Principal, VP, Class Teacher

Visibility: Staff only, never shown to parents through app

Used in: Academic Journey report, student profile

## __9\.2 Parent\-Teacher Meeting Scheduler__

Admin creates PTM event with date, time slots

Parents book a slot through mobile app \(first\-come basis\)

Teacher sees scheduled appointments

Auto\-reminder WhatsApp 24 hours before appointment

PTM attendance marked after meeting

## __9\.3 Online Circular and Notice Board__

Admin or Principal creates circulars with PDF attachment

Target: all students, specific class, specific role

Circular appears in mobile app notification and ERP dashboard

Read receipt tracking: who opened the circular

Export: list of students who have and have not read

## __9\.4 Staff Daily Diary and Lesson Plan__

Teacher submits lesson plan for the week \(what topic, which chapter\)

Academic Coordinator reviews and approves lesson plans

Daily diary: teacher records what was actually taught vs planned

Report: lesson plan compliance report for each teacher

## __9\.5 Online Admission Form \(Full, Not Just Enquiry\)__

Parents fill a complete admission application form online

Fields: all student and family details, document uploads

Admission fee payment via Razorpay on form submission

Application tracked in Lead CRM with status: Form Submitted

Admin reviews and accepts/rejects from ERP

On acceptance: student profile auto\-created from form data

## __9\.6 Certificate Generation__

Types: Bonafide Certificate, Transfer Certificate, Character Certificate, Study Certificate

Admin fills template and generates PDF with school letterhead and principal signature field

Certificate number auto\-generated and tracked

Parent can request via mobile app, admin generates and sends via email

## __9\.7 Exam Seating Arrangement__

Admin sets: number of rooms, seats per room, exam date

System auto\-allocates students to seats with roll number and room

Generates seating chart PDF per room

Hall ticket generation: student name, roll no, room, seat, exam schedule

## __9\.8 Co\-curricular Activity Tracking__

Log activities: debate, sports, arts, science fair, quiz, robotics competition

Assign students to activities with role \(participant, leader, coordinator\)

Track achievements and awards per activity

Shows in student profile and academic journey report

## __9\.9 Vehicle Tracking Integration \(GPS Ready\)__

Transport module has GPS\-ready endpoints from day one

When GPS device is installed on school vehicle, connect via: POST /api/v1/transport/location

Real\-time location stored and served to parent mobile app

Geofence alert: notify parents when bus is 5 minutes from their stop

## __9\.10 Canteen and Mess Management \(for Hostel\)__

Weekly menu management by warden

Daily meal count for mess planning

Students mark meal preference through app \(hostel students only\)

Monthly mess bill generated and linked to hostel fee module

## __9\.11 Teacher Payroll Module__

Monthly salary calculation based on: basic salary, HRA, DA, deductions

PF and ESI deduction tracking

Pay slip generation as PDF

Bank transfer instruction export \(Excel with IFSC, account, amount\)

Annual Form 16 data export for income tax filing

## __9\.12 School Event Management__

Create events: Sports Meet, Annual Day, Science Fair, Parent Day, Independence Day

Assign organizers and roles to staff

Budget allocation and expense tracking per event

Student participation tracking

Post\-event photo gallery linked directly to website gallery

## __9\.13 Inventory and Asset Management__

Track school assets: computers, projectors, furniture, lab equipment

Purchase records with date, amount, vendor

Maintenance request: staff raises request, IT or admin assigns

Disposal records for deprecated assets

Asset report: total value, working/non\-working count per category

## __9\.14 Daily School Report \(Auto\-Generated\)__

Every day at 6pm: system generates a daily summary and emails to admin@bfpsedu\.in

Contents: today's attendance percentage, fee collected, new leads, leaves approved

Absent staff list with substitution details

Pending approvals count: leaves, fee concessions, career applications

# __SECTION 10: GRANULAR TASK LIST__

__Sequential execution\. One task at a time\. Full pipeline on every file\.__

__Every task marked PUSH means: git add \+ git commit \+ git push \+ create PR \+ lint \+ tests \+ Copilot review \+ merge\.__

## __PHASE 0: REPOSITORY AND ENVIRONMENT__

1\.1    Create private repo 'bfps\-erp\-ecosystem' under school GitHub account

1\.1\.1  Set visibility: Private | Initialize README\.md | PUSH

1\.1\.2  Add \.gitignore for Node\.js, Next\.js, Flutter | PUSH

1\.1\.3  Set branch protection: require PR before any merge to main | PUSH

1\.1\.4  Enable GitHub Copilot review on the repository | PUSH

1\.2    Configure GitHub MCP, Database MCP, Playwright MCP, Linter MCP

1\.2\.1  Verify each MCP can perform its assigned tasks | PUSH

2\.1    Create /docs folder in repository root | PUSH

2\.2    Upload all FINAL\_0x documents to /docs folder | PUSH

2\.3    Create local folder: BabaFaridPublicSchool/Gallery Photo/logo/ \(keep locally, not in repo\)

## __PHASE 1: BACKEND FOUNDATION__

3\.1    Create /backend directory | PUSH

3\.2    Create /backend/package\.json with all dependencies | PUSH

3\.3    Create /backend/\.env\.example with all variable names from Section 5 of REF\_03 | PUSH

3\.4    Create /backend/src/app\.js with Helmet, CORS, Morgan, rate limiter, Sentry | PUSH

3\.5    Create /backend/src/server\.js | PUSH

3\.6    Create directories: routes, controllers, middleware, utils, services, cron, \_\_tests\_\_ | PUSH each

4\.1    Create /backend/prisma/schema\.prisma | PUSH

4\.2    Add User model and Role enum | PUSH

4\.3    Add Student model | PUSH

4\.4    Add Staff model | PUSH

4\.5    Add Class and Subject models | PUSH

4\.6    Add Attendance model | PUSH

4\.7    Add FeeStructure and FeePayment models | PUSH

4\.8    Add PaymentOrder model | PUSH

4\.9    Add Exam and ExamResult models | PUSH

4\.10   Add LeaveRequest model with all enums \(see FINAL\_02\) | PUSH

4\.11   Add Lead model | PUSH

4\.12   Add CareerApplication and JobPosting models \(see FINAL\_03\) | PUSH

4\.13   Add ContactEnquiry model \(see FINAL\_03\) | PUSH

4\.14   Add Notification and SMSTemplate models | PUSH

4\.15   Add Timetable model | PUSH

4\.16   Add Homework and HomeworkSubmission models | PUSH

4\.17   Add Library models: Book, BookIssue | PUSH

4\.18   Add Transport models: TransportRoute, StudentTransport | PUSH

4\.19   Add Hostel models: HostelRoom, HostelAllocation | PUSH

4\.20   Add Blog, Gallery, CMS, Career, Contact, Visitor, System models | PUSH

4\.21   Add Disciplinary, PTM, Circular, LessonPlan, Certificate, Asset models | PUSH

4\.22   Add all database indexes listed in FINAL\_04 | PUSH

4\.23   Run: npx prisma migrate dev \-\-name init\_complete | PUSH

4\.24   Create seed\.js with admin user, class data, default CMS content | PUSH

4\.25   Run seed and verify all tables in Supabase dashboard | PUSH

5\.1    Create jwt\.utils\.js | PUSH

5\.2    Create encryption\.utils\.js \(AES\-256 for Aadhaar and bank fields\) | PUSH

5\.3    Create email\.utils\.js \(Nodemailer via Serverbyte SMTP\) | PUSH

5\.4    Create whatsapp\.service\.js \(Twilio\) | PUSH

5\.5    Create redis\.service\.js \(Upstash\) | PUSH

5\.6    Create audit\.service\.js \(log every action\) | PUSH

5\.7    Create auth\.middleware\.js \(JWT verification \+ RBAC\) | PUSH

5\.8    Create ratelimit\.middleware\.js | PUSH

5\.9    Create upload\.middleware\.js \(Multer \+ Cloudinary \+ MIME type validation\) | PUSH

5\.10   Create validate\.middleware\.js \(Zod schema validation\) | PUSH

5\.11   Create sanitize\.middleware\.js \(XSS prevention\) | PUSH

5\.12   Create auth\.controller\.js \(login, logout, forgot, reset, refresh, 2FA\) | PUSH

5\.13   Create auth\.routes\.js | PUSH

5\.14   Create auth\.test\.js with all auth test cases | PUSH

## __PHASE 2: BACKEND MODULES \(one PUSH per file for each module\)__

6\.   Student module: controller, bulk import service, ID card PDF service, routes, tests

7\.   Attendance module: controller, WhatsApp trigger service, cron, routes, tests

8\.   Fee module: controller, Razorpay service, receipt PDF service, reconciliation cron, routes, tests

9\.   Exam module: controller, report card PDF service, ICSE grading logic, routes, tests

10\.  Staff module: controller, routes, tests

11\.  Leave module: IMAP service, dedup service, notification service, cron, controller, routes, tests \(see FINAL\_02\)

12\.  Timetable module: controller, substitution service, routes, tests

13\.  Lead CRM module: controller, WhatsApp service, routes, tests

14\.  Career module: IMAP service, dedup service, controller, routes, tests \(see FINAL\_03\)

15\.  Contact module: IMAP service, dedup service, controller, routes, tests \(see FINAL\_03\)

16\.  Notification module: WhatsApp\+Email\+SMS\+Push controller, multi\-language templates, routes

17\.  Blog module: controller, auto\-publish webhook endpoint, routes

18\.  CMS module: all content controllers for slides, highlights, programs, facilities, testimonials, stats, gallery

19\.  Export/Import module: toCSV, toXLSX, toPDF, toDOCX services, controller, routes

20\.  Analytics module: dashboard KPIs, attendance trends, fee charts, lead funnel, exam performance

21\.  Custom report builder: field selector, filter engine, export in 4 formats, scheduled delivery

22\.  Fee concessions: concession types, approval workflow, controller, routes

23\.  Academic year management: year creation, student promotion, alumni conversion

24\.  Certificate generation: bonafide, TC, character, study certificate PDF

25\.  Visitor management: log, notify staff, visitor pass PDF, controller, routes

26\.  Payroll module: salary calc, pay slip PDF, bank export, Form 16 data

27\.  PTM scheduler: slot management, booking, reminder WhatsApp, attendance marking

28\.  Disciplinary records: controller, routes

29\.  Co\-curricular tracking: activity CRUD, student assignment, achievement tracking

30\.  Exam seating and hall ticket: room allocation, seating chart PDF, hall ticket PDF

31\.  Inventory: asset CRUD, maintenance request, disposal, asset report

32\.  Event management: event CRUD, organizer assignment, budget tracking, gallery link

33\.  Daily school report cron: auto\-generate and email summary at 6pm every day

34\.  Lesson plan and daily diary: teacher submission, coordinator review

35\.  Redis caching layer: add caching to CMS endpoints and class list endpoints

36\.  Database backup cron: daily at 1am, upload to Cloudinary private folder

37\.  System health endpoint: ping all 6 services, return status

38\.  Sentry integration: add to app\.js error handler

39\.  Swagger documentation: add JSDoc to all routes, serve at /api/v1/docs

## __PHASE 3: ERP FRONTEND \(one PUSH per file\)__

40\.  Initialize /frontend with Next\.js 14, TypeScript, Tailwind, all dependencies

41\.  Configure Tailwind with BFPS brand colors and Inter/Poppins fonts

42\.  Setup: Axios client with interceptors, Auth context, React Query, Sentry

43\.  Build Sidebar \(role\-based menu\), Navbar \(profile, bell, dark mode\), ERP Layout

44\.  Admin Dashboard: KPI cards, attendance chart, fee chart, activity feed, quick actions

45\-55\. All ERP module pages: Students, Attendance, Fees, Exams, Staff, Leaves, Timetable, CRM, Notifications, Library, Transport

56\-65\. Hostel, Homework, Blog, Website CMS, Gallery, Careers, Contact, Analytics, Custom Reports, Visitor

66\-75\. Payroll, PTM, Disciplinary, Certificates, Co\-curricular, Seating, Inventory, Events, Academic Year, Lesson Plans

76\.  Settings: Role Management \(Master Admin only\), User Management, System Configuration

77\.  Health Monitor page \(Master Admin and IT only\)

78\.  PWA: service worker, manifest, offline shell

## __PHASE 4: SCHOOL WEBSITE \(one PUSH per file\)__

79\.  Initialize /website with Next\.js 14, TypeScript, Tailwind, Framer Motion

80\-95\. Build all sections: Navbar, Hero, About, Vision/Mission, WhyChoose, Academics, Programs, Faculty, Facilities, Testimonials, Gallery, AdmissionCTA, BlogPreview, Statistics, Social, Footer

96\-105\. Build all pages: Home, About, Academics, Programs, Faculty, Facilities, Admissions, Gallery, Blog, BlogPost, Careers, Contact, Privacy, Terms

106\. Build popup and announcement system

107\. Website SEO: OpenGraph, Twitter cards, sitemap\.xml, robots\.txt

## __PHASE 5: MOBILE APP \(one PUSH per file\)__

108\. Initialize /mobile Flutter project with Firebase, Dio, Razorpay SDK, Sentry

109\. Login screen, forgot password screen, 2FA screen

110\-115\. Parent role screens: Dashboard, Attendance calendar, Fee ledger and Pay, Results, Homework, Notices

116\-120\. Teacher role screens: Dashboard, Quick attendance, Homework post, Marks entry, My Leave

121\-125\. Admin role screens: Dashboard, Leads, Approvals, Broadcast, Fee summary

126\-130\. Principal, Director, Transport, Hostel, Librarian role screens

131\. Notification center, Profile, Settings, Logout

## __PHASE 6: BLOG__

132\. Initialize /blog with Next\.js, SEO defaults, sitemap, RSS feed

133\. Build blog layout, post listing, individual post, categories, newsletter form

## __PHASE 7: DEPLOYMENT__

134\. GitHub Actions CI/CD: lint, test, build on PR\. Deploy on merge\.

135\. Connect all four Vercel projects to their domains

136\. Deploy backend to Railway\. Set environment variables in Railway dashboard\.

137\. Run full E2E test suite against production URLs

138\. Verify health endpoint returns all green

139\. FINAL COMMIT: 'release: v1\.0\.0 BFPS ERP Ecosystem production launch'

# __SECTION 11: EXECUTION PROMPTS__

## __PROMPT A \-\- Work Laptop \(paste this into Anti\-Gravity to begin\)__

You are Anti\-Gravity\. You are building the BFPS School ERP Ecosystem\.

COMMIT RULE: After every single file operation:

  git add \[specific file only\]

  git commit \-m "type\(scope\): description"

  git push origin feature/\[branch\]

  Create PR \-> Linter MCP \-> Playwright MCP \-> Copilot review \-> auto\-merge

  One file = one commit = one push = one PR\. No batching ever\.

MCP RULES:

  GitHub MCP: all git operations

  Database MCP: all Prisma and Supabase operations

  Playwright MCP: all testing

  Linter MCP: ESLint, Stylelint, PyLint, dart analyze on every PR

STEP 1 \-\- Read all documents in the docs folder in this order:

  FINAL\_01\_Master\_Execution\_Doc\.docx  <\- this document, already read

  FINAL\_02\_Leave\_Management\.docx

  FINAL\_03\_Career\_Contact\_Dedup\.docx

  FINAL\_04\_ERD\_Enhanced\.docx

  FINAL\_05\_API\_Contracts\_Enhanced\.docx

  FINAL\_06\_UI\_Wireframes\_Enhanced\.docx

  FINAL\_07\_Social\_Media\_Handles\.docx

  FINAL\_08\_School\_Pamphlet\.pdf

  FINAL\_09\_Ultimate\_Master\_Doc\.docx

STEP 2 \-\- Confirm understanding with this summary:

  Platforms being built: \[answer\]

  User roles: \[answer\]

  API prefix: \[answer\]

  Master Admin email \(hardcoded\): \[answer\]

  Deployment: \[answer\]

STEP 3 \-\- Begin Task 1\.1 from Section 10\.

Report after every task:

  STATUS: DONE | FILE: \[path\] | LINT: PASS | TESTS: PASS | PR: MERGED | NEXT: \[task\]

Do not stop unless there is a hard error you cannot resolve\. Begin now\.

## __PERSONAL LAPTOP \-\- Step 1 \(run in Windows CMD first\)__

git config \-\-global user\.name "rishikkumar84a"

git config \-\-global user\.email "\[email linked to your rishikkumar84a GitHub\]"

cd C:\\Users\\YourName\\Documents

git clone https://github\.com/bfps\-school/bfps\-erp\-ecosystem\.git

cd bfps\-erp\-ecosystem

git remote add personal https://github\.com/rishikkumar84a/bfps\-erp\-ecosystem\.git

git push personal main

## __PERSONAL LAPTOP \-\- Step 2 \(paste into Anti\-Gravity\)__

You are Anti\-Gravity\. Resuming BFPS ERP development on a new machine\.

COMMIT RULE: After every single file operation:

  git add \[specific file only\]

  git commit \-m "type\(scope\): description"

  git push origin feature/\[branch\]

  git push personal feature/\[branch\]  <\- also push to rishikkumar84a

  Create PR \-> Linter MCP \-> Playwright MCP \-> Copilot review \-> auto\-merge

  One file = one commit = two pushes = one PR\. No batching ever\.

MCP RULES: Same as Work Laptop\. GitHub MCP, Database MCP, Playwright MCP, Linter MCP\.

RESUME STEPS:

  Step 1: Read all documents in the docs folder\. Start with FINAL\_01\.

  Step 2: Run: git log \-\-oneline \-15

  Step 3: Find the last completed task number from the commit messages\.

  Step 4: Open Section 10 in FINAL\_01 and find the next task after the last one\.

Announce before starting:

  RESUMING | Last task: \[X\.X\] \-\- \[name\] | Starting: \[X\.X\+1\] \-\- \[name\]

  Both remotes active \(origin and personal\) | Begin

Do not recreate anything that already exists\. Continue forward only\.

END OF DOCUMENT

FINAL\_01 Master Execution Document v3\.1 | April 2026 | erp\.bfpsedu\.in

