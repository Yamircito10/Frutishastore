// firebase.js

// Configuración centralizada de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY_REAL",
  authDomain: "frutisha-store.firebaseapp.com",
  projectId: "inventario-ab270",
  storageBucket: "frutisha-store.appspot.com",
  messagingSenderId: "939130405966",
  appId: "1:939130405966:web:TU_APP_ID_REAL"
};

// Inicializar Firebase solo una vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exportar Firestore global
window.db = firebase.firestore();