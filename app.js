// app.js

// Inicializar Firebase Auth y Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Verificar si estamos en una página protegida (inventario, ventas, etc.)
document.addEventListener('DOMContentLoaded', () => {
  const protectedPages = ['inventario.html', 'ventas.html', 'index.html'];
  const currentPage = window.location.pathname.split('/').pop();

  if (protectedPages.includes(currentPage)) {
    auth.onAuthStateChanged(user => {
      if (!user) {
        // Si no hay usuario autenticado, redirigir a login
        window.location.href = "login.html";
      } else {
        console.log(`Bienvenido ${user.email}`);
      }
    });
  }
});

// Función para iniciar sesión
async function login(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    alert("Inicio de sesión exitoso");
    window.location.href = "index.html";
  } catch (error) {
    alert("Error en el inicio de sesión: " + error.message);
  }
}

// Función para cerrar sesión
async function logout() {
  await auth.signOut();
  alert("Sesión cerrada");
  window.location.href = "login.html";
}

// Cargar productos (usado en index.html)
async function cargarProductos() {
  const productosDiv = document.getElementById('productos');
  if (!productosDiv) return;

  const snapshot = await db.collection("productos").get();
  productosDiv.innerHTML = '';
  snapshot.forEach(doc => {
    const producto = doc.data();
    const div = document.createElement('div');
    div.innerHTML = `
      <h3>${producto.nombre}</h3>
      <p>Precio: S/ ${producto.precio}</p>
      <p>Stock: ${producto.stock}</p>
      <button onclick="agregarAlCarrito('${doc.id}')">Agregar</button>
    `;
    productosDiv.appendChild(div);
  });
}

// Agregar producto al carrito (localStorage)
function agregarAlCarrito(id) {
  let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
  carrito.push(id);
  localStorage.setItem('carrito', JSON.stringify(carrito));
  alert("Producto agregado al carrito");
}

// Cerrar sesión desde cualquier página
const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}