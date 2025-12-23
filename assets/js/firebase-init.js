// Firebase init (shared)
const firebaseConfig = {
    apiKey: "AIzaSyBtNWOs53cdTm0SYUZe_qCQb4OC-_VdcMQ",
    authDomain: "frutisha-store.firebaseapp.com",
    projectId: "inventario-ab270",
    storageBucket: "frutisha-store.appspot.com",
    messagingSenderId: "15388676345",
    appId: "1:15388676345:web:72c8e22a2aece1d4151228"
  };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
