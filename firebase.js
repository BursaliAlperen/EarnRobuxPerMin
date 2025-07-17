// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase config (senin yapılandırman)
const firebaseConfig = {
  apiKey: "AIzaSyCIvtxUQxK9dVMG51xFkc_QyieKSn55DdM",
  authDomain: "earnrobuxpermin.firebaseapp.com",
  projectId: "earnrobuxpermin",
  storageBucket: "earnrobuxpermin.appspot.com",
  messagingSenderId: "478198336251",
  appId: "1:478198336251:web:74ac881afe8a196bbcbe5e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Kayıt fonksiyonu
export function register(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Giriş fonksiyonu
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Çıkış fonksiyonu
export function logout() {
  return signOut(auth);
}

// Kullanıcı durumu değiştiğinde
export function onUserChange(callback) {
  onAuthStateChanged(auth, callback);
}
