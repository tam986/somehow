'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { AppState } from '@/types';

// Các config này sẽ được lấy từ file .env.local (Local) hoặc Vercel Environment Variables (Production)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Khởi tạo Firebase
const isConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.databaseURL;
let app;
let database: any = null;

if (typeof window !== 'undefined' && isConfigured && getApps().length === 0) {
    try {
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        console.log("Firebase Database Initialized!");
    } catch (err) {
        console.error("Firebase initialization error", err);
    }
}

export const syncStateToFirebase = (state: AppState) => {
    if (!database) return;
    const dbRef = ref(database, 'appState');
    set(dbRef, state).catch((err: any) => console.error("Sync error:", err));
};

export const loadStateFromFirebase = (onLoaded: (state: AppState) => void) => {
    if (!database) return () => { }; // Trả về hàm huỷ trống

    const dbRef = ref(database, 'appState');
    const unsubscribe = onValue(dbRef, (snapshot: any) => {
        const data = snapshot.val();
        onLoaded(data);
    });

    return unsubscribe;
};

export default { isConfigured };
