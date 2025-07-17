// 1) Gerekli SDK’ları import et
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Auth için ek importlar:
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// 2) Mevcut config’in
const firebaseConfig = {
  apiKey: "AIzaSyCIvtxUQxK9dVMG51xFkc_QyieKSn55DdM",
  authDomain: "earnrobuxpermin.firebaseapp.com",
  databaseURL: "https://earnrobuxpermin-default-rtdb.firebaseio.com",
  projectId: "earnrobuxpermin",
  storageBucket: "earnrobuxpermin.firebasestorage.app",
  messagingSenderId: "478198336251",
  appId: "1:478198336251:web:74ac881afe8a196bbcbe5e",
  measurementId: "G-Y27VJZMQR2"
};

// 3) Firebase’i başlat
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 4) Auth nesnelerini oluştur
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 5) Giriş Fonksiyonu
export function googleLogin() {
  return signInWithPopup(auth, provider)
    .then(result => {
      console.log("Giriş başarılı:", result.user.displayName);
      return result.user;
    })
    .catch(err => {
      console.error("Giriş hatası:", err);
      throw err;
    });
}

// 6) Çıkış Fonksiyonu
export function googleLogout() {
  return signOut(auth)
    .then(() => console.log("Çıkış yapıldı"))
    .catch(err => console.error("Çıkış hatası:", err));
}

// 7) Giriş durumu dinleme (opsiyonel)
export function onUserStateChange(callback) {
  return onAuthStateChanged(auth, user => {
    callback(user); // user null ise çıkış, obje ise giriş
  });
    }
