// app.js
// Gestión principal de la tienda Fruitsha Store
// Versión optimizada con la lógica original de carga de productos

// Variables globales
let carrito = [];
let historialVentas = JSON.parse(localStorage.getItem("historialVentas")) || [];

// Referencias a elementos
const productosLista = document.getElementById("productos-lista");
const carritoLista = document.getElementById("carrito-lista");
const totalSpan = document.getElementById("total");
const finalizarBtn = document.getElementById("finalizar-venta");
const reiniciarBtn = document.getElementById("reiniciar-carrito");
const borrarHistorialBtn = document.getElementById("borrar-historial");
const descargarTxtBtn = document.getElementById("descargar-txt");

// Productos cargados como en tu código original
const productos = [
  { id: 1, nombre: "Polera Negra", precio: 50, tallas: ["S", "M", "L"] },
  { id: 2, nombre: "Polera Blanca", precio: 50, tallas: ["S", "M", "L"] },
  { id: 3, nombre: "Polo Azul", precio: 30, tallas: ["S", "M", "L"] },
  { id: 4, nombre: "Polo Rojo", precio: 30, tallas: ["S", "M", "L"] }
];

// Función para mostrar productos en la página
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
      <button onclick="agregarAlCarrito(${producto.id})">Agregar</button>
    `;
    productosLista.appendChild(div);
  });
}

// Agregar producto al carrito
function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  const tallaSeleccionada = document.getElementById(`talla-${id}`).value;

  carrito.push({ ...producto, talla: tallaSeleccionada });
  actualizarCarrito();
}

// Actualizar vista del carrito
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

// Eliminar producto del carrito
function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
}

// Finalizar venta
finalizarBtn.addEventListener("click", () => {
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
  alert("Venta finalizada y guardada en el historial.");
});

// Reiniciar carrito
reiniciarBtn.addEventListener("click", () => {
  carrito = [];
  actualizarCarrito();
});

// Borrar historial
borrarHistorialBtn.addEventListener("click", () => {
  if (confirm("¿Estás seguro de borrar todo el historial?")) {
    historialVentas = [];
    localStorage.removeItem("historialVentas");
    alert("Historial borrado.");
  }
});

// Descargar historial en TXT
descargarTxtBtn.addEventListener("click", () => {
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
});

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  mostrarProductos();
  actualizarCarrito();
});