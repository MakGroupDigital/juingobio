# JuingoBIO Deployment Guide

## 1) Vercel
1. Connect the GitHub repository in Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add env var `GEMINI_API_KEY` in Vercel project settings.
6. Deploy.

## 2) Firebase Hosting (static)
```bash
npm run build
firebase deploy --only hosting
```

## 3) Firebase App Hosting
1. In Firebase Console, open **App Hosting** and connect this repository.
2. Branch: `main`.
3. Build command: `npm run build`.
4. Start command: `npm run start`.
5. Runtime env var: `GEMINI_API_KEY`.
6. Deploy.

## 4) PWA checklist
- `public/manifest.webmanifest`
- `public/sw.js`
- Icons in `public/icons/`
- Screenshots in `public/screenshots/`
- Native notification permission flow in app settings.
