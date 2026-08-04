/* =========================================================
   firebase-config.js — Firebase project config & init
   Loaded after the firebase-app-compat / firebase-database-compat
   SDK scripts. Exposes window.FirebaseDB for storage.js to use.

   Note: a Firebase *web* apiKey is safe to ship in client code —
   it only identifies the project, it isn't a secret. Actual access
   control is enforced by your Realtime Database security rules
   (see README.md for the recommended rule set).
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDhBC3GxiWZ2MR3vlgdGHFLrVszEPe0ZHc",
  authDomain: "bp-sugar-tracker-19169.firebaseapp.com",
  databaseURL: "https://bp-sugar-tracker-19169-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bp-sugar-tracker-19169",
  storageBucket: "bp-sugar-tracker-19169.firebasestorage.app",
  messagingSenderId: "837714829472",
  appId: "1:837714829472:web:29244a04c76f729aee69c5",
  measurementId: "G-VKFVF7K64B"
};

window.FirebaseDB = null;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.FirebaseDB = firebase.database();
  } else {
    console.error('Firebase SDK가 로드되지 않았습니다 (오프라인이거나 네트워크 차단).');
  }
} catch (e) {
  console.error('Firebase 초기화 실패', e);
}
