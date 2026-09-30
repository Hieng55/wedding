import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDUwFcirhX7mectdUsB1u_xpsPI2FJ-uu0",
  authDomain: "wedding-91f41.firebaseapp.com",
  databaseURL: "https://wedding-91f41-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wedding-91f41",
  storageBucket: "wedding-91f41.firebasestorage.app",
  messagingSenderId: "1013961123768",
  appId: "1:1013961123768:web:c984a95bd12830f8d2d14d",
  measurementId: "G-JEX5JWHQ8Q"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

isSupported().then((supported) => {
  if (supported) getAnalytics(app);
});

export const database = getDatabase(app);
export const storage = getStorage(app);
