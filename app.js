// Variables
let productos = [];
let carrito = [];
let historialVentas = JSON.parse(localStorage.getItem("historialVentas")) || [];

// Referencias HTML
const productosLista = document.getElementById("productos-lista");
const carritoLista = document.getElementById("carrito-lista");
const totalSpan = document.getElementById("total");
const ventasHistorialDiv = document.getElementById("ventas-historial");

// ===== Función para cargar productos desde Firebase =====
function cargarProductos() {
  db.collection("productos").get()
    .then(snapshot => {
      // Convertimos cada documento a un objeto con id
      productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      mostrarProductos();
    })
    .catch(err => console.error("Error cargando productos:", err));
}

// ===== Mostrar productos en pantalla =====
function mostrarProductos() {
  productosLista.innerHTML = "";
  productos.forEach(producto => {
    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
      <h3>${producto.nombre}</h3>
      <p>Precio: S/ ${producto.precio}</p>
      <label>Talla:
        <select id="talla-${producto.id}">
          ${producto.tallas.map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>
      </label>
      <button onclick="agregarAlCarrito('${producto.id}')">Agregar</button>
    `;
    productosLista.appendChild(div);
  });
}

// ===== Agregar producto al carrito =====
function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  const tallaSeleccionada = document.getElementById(`talla-${id}`).value;
  carrito.push({ ...producto, talla: tallaSeleccionada });
  actualizarCarrito();
}

// ===== Actualizar carrito =====
function actualizarCarrito() {
  carritoLista.innerHTML = "";
  let total = 0;

  carrito.forEach((item, index) => {
    total += item.precio;
    const li = document.createElement("li");
    li.textContent = `${item.nombre} - Talla: ${item.talla} - S/ ${item.precio}`;
    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "X";
    btnEliminar.onclick = () => eliminarDelCarrito(index);
    li.appendChild(btnEliminar);
    carritoLista.appendChild(li);
  });

  totalSpan.textContent = total.toFixed(2);
}

// ===== Eliminar producto del carrito =====
function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
}

// ===== Finalizar venta =====
function finalizarVenta() {
  if (carrito.length === 0) {
    alert("El carrito está vacío.");
    return;
  }
  historialVentas.push({
    fecha: new Date().toLocaleString(),
    productos: [...carrito],
    total: carrito.reduce((acc, item) => acc + item.precio, 0)
  });
  localStorage.setItem("historialVentas", JSON.stringify(historialVentas));
  carrito = [];
  actualizarCarrito();
  mostrarHistorial();
  alert("Venta finalizada y guardada en el historial.");
}

// ===== Reiniciar carrito =====
function reiniciarCarrito() {
  carrito = [];
  actualizarCarrito();
}

// ===== Mostrar historial en pantalla =====
function mostrarHistorial() {
  ventasHistorialDiv.innerHTML = "";
  historialVentas.forEach((venta, i) => {
    const div = document.createElement("div");
    div.classList.add("venta");
    div.innerHTML = `<strong>Venta #${i + 1} - ${venta.fecha}</strong>
                     <button onclick="eliminarVenta(${i})">Eliminar</button>`;
    const ul = document.createElement("ul");
    venta.productos.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.nombre} (Talla: ${p.talla}) - S/ ${p.precio}`;
      ul.appendChild(li);
    });
    div.appendChild(ul);
    div.innerHTML += `<p>Total: S/ ${venta.total}</p>`;
    ventasHistorialDiv.appendChild(div);
  });
}

// ===== Eliminar venta individual =====
function eliminarVenta(index) {
  if (confirm(`¿Eliminar la venta #${index + 1}?`)) {
    historialVentas.splice(index, 1);
    localStorage.setItem("historialVentas", JSON.stringify(historialVentas));
    mostrarHistorial();
  }
}

// ===== Borrar historial completo =====
function borrarHistorial() {
  if (confirm("¿Estás seguro de borrar todo el historial?")) {
    historialVentas = [];
    localStorage.removeItem("historialVentas");
    mostrarHistorial();
    alert("Historial borrado.");
  }
}

// ===== Descargar historial en TXT =====
function descargarHistorial() {
  if (historialVentas.length === 0) {
    alert("No hay ventas para descargar.");
    return;
  }
  let contenido = "Historial de Ventas\n\n";
  historialVentas.forEach((venta, i) => {
    contenido += `Venta #${i + 1}\nFecha: ${venta.fecha}\n`;
    venta.productos.forEach(p => {
      contenido += `- ${p.nombre} (Talla: ${p.talla}) - S/ ${p.precio}\n`;
    });
    contenido += `Total: S/ ${venta.total}\n\n`;
  });

  const blob = new Blob([contenido], { type: "text/plain" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "historial_ventas.txt";
  enlace.click();
}

// ===== Inicialización =====
document.addEventListener("DOMContentLoaded", () => {
  cargarProductos(); // Carga productos desde Firebase
  actualizarCarrito();
  mostrarHistorial();
});