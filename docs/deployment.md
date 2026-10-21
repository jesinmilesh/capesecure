# Cape Secure Solutions — Deployment Guide

## 1. Public Website Deployment (Vercel)
- **Repository Root**: `e:\Cape Secure`
- **Output Directory**: `public/`
- **Vercel Config**: `vercel.json` (root)
- **Serverless API Routes**: `api/`
- **Build Command**: `npm run validate`

### Environment Variables (Vercel Project Settings)
```ini
NODE_ENV=production
PUBLIC_URL=https://capesecure.vercel.app
API_URL=https://capesecure.vercel.app/api
ADMIN_ORIGIN=https://admin.capesecure.vercel.app
BREVO_API_KEY=xkeysib-your-production-brevo-api-key
BREVO_ADMIN_EMAIL=capesecuresolutions@gmail.com
COMPANY_EMAIL=capesecuresolutions@gmail.com
COMPANY_PHONE=+91 93425 80133
```

## 2. Admin Website Deployment (Vercel Independent App)
- **Repository / Directory**: `admin-app/` (or `e:\Cape Secure Admin\admin-app`)
- **Framework Preset**: Other / Static HTML
- **Root Directory**: `admin-app/`
- **Domain**: `https://admin.capesecure.vercel.app`

### Environment Variables
```ini
ADMIN_API_URL=https://capesecure.vercel.app/api
PUBLIC_WEBSITE_URL=https://capesecure.vercel.app
```

## 3. Dedicated Backend Server (VPS / Cloud Container)
- **Root Directory**: `backend/` (entry: `backend/server.js`)
- **Port**: 3000
- **Process Manager**: PM2 (`pm2 start backend/server.js --name capesecure-api`)
