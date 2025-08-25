// Productos con tallas (como en tu código original)
const productos = [
  { nombre: "Polera", tallas: ["S", "M", "L"], precio: 25 },
  { nombre: "Jeans", tallas: ["28", "30", "32"], precio: 60 },
  { nombre: "Casaca", tallas: ["M", "L", "XL"], precio: 80 },
  { nombre: "Polo", tallas: ["S", "M", "L", "XL"], precio: 20 }
];

let carrito = [];
let historial = JSON.parse(localStorage.getItem("historial")) || [];

// Mostrar productos
function cargarProductos() {
  const cont = document.getElementById("productos-container");
  cont.innerHTML = "";
  productos.forEach((prod, i) => {
    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
      <h3>${prod.nombre}</h3>
      <p>Precio: ${prod.precio} soles</p>
      <label>Talla:</label>
      <select id="talla-${i}">
        ${prod.tallas.map(t => `<option value="${t}">${t}</option>`).join("")}
      </select>
      <button onclick="agregarCarrito(${i})">Agregar</button>
    `;
    cont.appendChild(div);
  });
}

// Agregar producto
function agregarCarrito(i) {
  const talla = document.getElementById(`talla-${i}`).value;
  const prod = productos[i];
  carrito.push({ ...prod, talla });
  actualizarTotal();
}

// Actualizar total
function actualizarTotal() {
  const total = carrito.reduce((s, p) => s + p.precio, 0);
  document.getElementById("total").textContent = total;
}

// Finalizar venta
function finalizarVenta() {
  if (carrito.length === 0) return alert("El carrito está vacío");
  historial.push({ fecha: new Date().toLocaleString(), carrito });
  localStorage.setItem("historial", JSON.stringify(historial));
  carrito = [];
  actualizarTotal();
  alert("Venta finalizada ✅");
}

// Reiniciar carrito
function reiniciarCarrito() {
  carrito = [];
  actualizarTotal();
}

// Historial
function cargarHistorial() {
  const cont = document.getElementById("historial-container");
  cont.innerHTML = "";
  historial.forEach((venta, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h4>Venta ${i + 1} - ${venta.fecha}</h4>
      <ul>
        ${venta.carrito.map(p => `<li>${p.nombre} (${p.talla}) - S/${p.precio}</li>`).join("")}
      </ul>
    `;
    cont.appendChild(div);
  });
}

// Borrar historial
function borrarHistorial() {
  if (confirm("¿Seguro que deseas borrar todo el historial?")) {
    historial = [];
    localStorage.removeItem("historial");
    cargarHistorial();
  }
}

// Descargar historial como TXT
function descargarHistorial() {
  let texto = "HISTORIAL DE VENTAS\n\n";
  historial.forEach((venta, i) => {
    texto += `Venta ${i + 1} - ${venta.fecha}\n`;
    venta.carrito.forEach(p => {
      texto += `  ${p.nombre} (${p.talla}) - S/${p.precio}\n`;
    });
    texto += "\n";
  });
  const blob = new Blob([texto], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "historial.txt";
  link.click();
}

// Cambiar sección
function mostrarSeccion(id) {
  document.querySelectorAll("main section").forEach(s => s.classList.add("oculto"));
  document.getElementById(id).classList.remove("oculto");
  if (id === "historial") cargarHistorial();
}

// Inicializar
window.onload = () => {
  cargarProductos();
  cargarHistorial();
};