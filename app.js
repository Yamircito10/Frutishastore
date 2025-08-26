// app.js

let carrito = [];
let historialVentas = JSON.parse(localStorage.getItem("historialVentas")) || [];

// Productos simulados
const productos = [
  { nombre: "Polera", precio: 35, tallas: ["S", "M", "L"] },
  { nombre: "Polo", precio: 25, tallas: ["S", "M", "L", "XL"] },
  { nombre: "Pantalón", precio: 50, tallas: ["M", "L"] }
];

// Renderizar productos
function mostrarProductos() {
  const contenedor = document.getElementById("productos-lista");
  contenedor.innerHTML = "";
  productos.forEach((p, index) => {
    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
      <strong>${p.nombre}</strong> - S/ ${p.precio}
      <select id="talla-${index}">
        ${p.tallas.map(t => `<option value="${t}">${t}</option>`).join("")}
      </select>
      <button onclick="agregarAlCarrito(${index})">Agregar</button>
    `;
    contenedor.appendChild(div);
  });
}

// Agregar producto al carrito
function agregarAlCarrito(index) {
  const talla = document.getElementById(`talla-${index}`).value;
  carrito.push({ ...productos[index], talla });
  actualizarCarrito();
}

// Actualizar carrito
function actualizarCarrito() {
  let total = carrito.reduce((suma, p) => suma + p.precio, 0);
  document.getElementById("total").textContent = `S/ ${total.toFixed(2)}`;
}

// Finalizar venta
function finalizarVenta() {
  if (carrito.length === 0) return alert("El carrito está vacío.");
  historialVentas.push({
    fecha: new Date().toLocaleString(),
    productos: [...carrito],
    total: carrito.reduce((s, p) => s + p.precio, 0)
  });
  localStorage.setItem("historialVentas", JSON.stringify(historialVentas));
  carrito = [];
  actualizarCarrito();
  mostrarHistorial();
}

// Reiniciar carrito
function reiniciarCarrito() {
  carrito = [];
  actualizarCarrito();
}

// Mostrar historial
function mostrarHistorial() {
  const contenedor = document.getElementById("ventas-historial");
  contenedor.innerHTML = "";
  historialVentas.forEach(v => {
    const div = document.createElement("div");
    div.innerHTML = `<p>${v.fecha} - Total: S/ ${v.total.toFixed(2)}</p>`;
    contenedor.appendChild(div);
  });
}

// Borrar historial
function borrarHistorial() {
  if (!confirm("¿Seguro que deseas borrar todo el historial?")) return;
  historialVentas = [];
  localStorage.removeItem("historialVentas");
  mostrarHistorial();
}

// Descargar historial en TXT
function descargarHistorial() {
  const contenido = historialVentas.map(v => `${v.fecha} - Total: S/ ${v.total.toFixed(2)}`).join("\n");
  const blob = new Blob([contenido], { type: "text/plain" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "historial_ventas.txt";
  enlace.click();
}

// Inicializar
mostrarProductos();
mostrarHistorial();