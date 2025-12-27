// firebase-init.js (compat)
// Pega tu firebaseConfig real aquí (Firebase console > Project settings > Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyBtNWOs53cdTm0SYUZe_qCQb4OC-_VdcMQ",
  authDomain: "inventario-ab270.firebaseapp.com",
  projectId: "inventario-ab270",
  storageBucket: "inventario-ab270.firebasestorage.app",
  messagingSenderId: "15388676345",
  appId: "1:15388676345:web:72c8e22a2aece1d4151228"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
