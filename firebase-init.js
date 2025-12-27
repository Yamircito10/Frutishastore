// firebase-init.js (compat)
// Pega tu firebaseConfig real aquí (Firebase console > Project settings > Your apps)
const firebaseConfig = {
  apiKey: "REEMPLAZA_AQUI",
  authDomain: "REEMPLAZA_AQUI",
  projectId: "REEMPLAZA_AQUI",
  storageBucket: "REEMPLAZA_AQUI",
  messagingSenderId: "REEMPLAZA_AQUI",
  appId: "REEMPLAZA_AQUI"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
