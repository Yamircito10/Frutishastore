// Inicialización de Firebase (usa la config de firebase.js)
const db = firebase.firestore();
const auth = firebase.auth();

// Referencias a elementos del DOM
const productosDiv = document.getElementById('productos');
const carritoLista = document.getElementById('carrito');
const totalSpan = document.getElementById('total');
const historialLista = document.getElementById('historial');
const finalizarCompraBtn = document.getElementById('finalizarCompra');
const logoutBtn = document.getElementById('logout');

// Variables de estado
let carrito = [];
let total = 0;

// --- Autenticación ---
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'login.html'; // Redirige si no hay sesión
  } else {
    cargarProductos();
    cargarHistorial();
  }
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// --- Cargar productos ---
async function cargarProductos() {
  productosDiv.innerHTML = 'Cargando productos...';
  try {
    const snapshot = await db.collection('productos').get();
    productosDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const producto = doc.data();
      const div = document.createElement('div');
      div.classList.add('producto');
      div.innerHTML = `
        <h3>${producto.nombre}</h3>
        <p>Precio: S/ ${producto.precio.toFixed(2)}</p>
        <p>Stock: ${producto.stock}</p>
        <button onclick="agregarAlCarrito('${doc.id}', '${producto.nombre}', ${producto.precio})">
          Agregar
        </button>
      `;
      productosDiv.appendChild(div);
    });
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
}

// --- Agregar al carrito ---
function agregarAlCarrito(id, nombre, precio) {
  carrito.push({ id, nombre, precio });
  actualizarCarrito();
}

function actualizarCarrito() {
  carritoLista.innerHTML = '';
  total = 0;
  carrito.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = `${item.nombre} - S/ ${item.precio.toFixed(2)}`;
    li.addEventListener('click', () => eliminarDelCarrito(index));
    carritoLista.appendChild(li);
    total += item.precio;
  });
  totalSpan.textContent = total.toFixed(2);
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
}

// --- Finalizar compra ---
finalizarCompraBtn.addEventListener('click', async () => {
  if (carrito.length === 0) {
    alert('Tu carrito está vacío');
    return;
  }

  const venta = {
    fecha: new Date(),
    productos: carrito,
    total
  };

  try {
    await db.collection('ventas').add(venta);
    alert('Compra registrada correctamente');
    carrito = [];
    actualizarCarrito();
    cargarHistorial();
  } catch (error) {
    console.error('Error registrando venta:', error);
  }
});

// --- Cargar historial de ventas ---
async function cargarHistorial() {
  historialLista.innerHTML = 'Cargando historial...';
  try {
    const snapshot = await db.collection('ventas').orderBy('fecha', 'desc').get();
    historialLista.innerHTML = '';
    snapshot.forEach(doc => {
      const venta = doc.data();
      const li = document.createElement('li');
      const fecha = venta.fecha.toDate().toLocaleString();
      li.textContent = `${fecha} - Total: S/ ${venta.total.toFixed(2)}`;
      historialLista.appendChild(li);
    });
  } catch (error) {
    console.error('Error cargando historial:', error);
  }
}