// Impor fungsi yang dibutuhkan dari SDK yang diperlukan
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase aplikasi web Anda
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi Cloud Firestore dan dapatkan referensi layanan
export const db = getFirestore(app);