'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Guard: Firebase must only initialize in the browser.
// During Next.js build-time static generation the env vars are absent,
// and getAuth() would throw auth/invalid-api-key.
const isBrowser = typeof window !== 'undefined';

const app           = isBrowser ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig)) : null;

export const auth           = isBrowser ? getAuth(app) : null;
if (auth) auth.tenantId = 'admin-tenant-jd6r5';
export const db             = isBrowser ? getDatabase(app) : null;
export const functions      = isBrowser ? getFunctions(app, 'us-central1') : null;
export const googleProvider = isBrowser ? new GoogleAuthProvider() : null;

export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
