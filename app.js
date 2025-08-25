// ===============================
// Configuración inicial
// ===============================

// Recuperar carrito e historial desde localStorage
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let historialVentas = JSON.parse(localStorage.getItem("historialVentas")) || [];

// ===============================
// Funciones de utilidad
// ===============================
function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function guardarHistorial() {
  localStorage.setItem("historialVentas", JSON.stringify(historialVentas));
}

function mostrarCarrito() {
  let contenedor = document.getElementById("carrito");
  contenedor.innerHTML = "";

  if (carrito.length === 0) {
    contenedor.innerHTML = "<p>El carrito está vacío</p>";
    return;
  }

  let tabla = document.createElement("table");
  tabla.innerHTML = `
    <tr>
      <th>Producto</th>
      <th>Talla</th>
      <th>Cantidad</th>
      <th>Precio</th>
      <th>Subtotal</th>
    </tr>
  `;

  let total = 0;

  carrito.forEach((prod, i) => {
    let subtotal = prod.cantidad * prod.precio;
    total += subtotal;

    let fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${prod.nombre}</td>
      <td>${prod.talla || "-"}</td>
      <td>${prod.cantidad}</td>
      <td>S/ ${prod.precio.toFixed(2)}</td>
      <td>S/ ${subtotal.toFixed(2)}</td>
    `;
    tabla.appendChild(fila);
  });

  contenedor.appendChild(tabla);

  let totalDiv = document.createElement("div");
  totalDiv.innerHTML = `<h3>Total: S/ ${total.toFixed(2)}</h3>`;
  contenedor.appendChild(totalDiv);
}

// ===============================
// Funciones principales
// ===============================
function agregarProducto(nombre, talla, precio, cantidad) {
  carrito.push({ nombre, talla, precio, cantidad });
  guardarCarrito();
  mostrarCarrito();
}

function finalizarVenta() {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  let venta = {
    fecha: new Date().toLocaleString(),
    productos: carrito,
  };

  historialVentas.push(venta);
  guardarHistorial();

  carrito = [];
  guardarCarrito();
  mostrarCarrito();

  alert("Venta registrada correctamente");
}

function reiniciarCarrito() {
  carrito = [];
  guardarCarrito();
  mostrarCarrito();
}

function borrarHistorial() {
  if (confirm("¿Seguro que deseas borrar el historial completo?")) {
    historialVentas = [];
    guardarHistorial();
    alert("Historial borrado.");
  }
}

function mostrarHistorial() {
  let contenedor = document.getElementById("contenedorHistorial");
  contenedor.innerHTML = "";

  if (historialVentas.length === 0) {
    contenedor.innerHTML = "<p>No hay ventas registradas</p>";
    return;
  }

  historialVentas.forEach((venta, i) => {
    let div = document.createElement("div");
    div.classList.add("venta");
    div.innerHTML = `
      <h4>Venta ${i + 1} - ${venta.fecha}</h4>
      <ul>
        ${venta.productos.map(p => `<li>${p.cantidad}x ${p.nombre} (T: ${p.talla || "-"}) - S/ ${(p.cantidad * p.precio).toFixed(2)}</li>`).join("")}
      </ul>
    `;
    contenedor.appendChild(div);
  });
}

function descargarHistorialTXT() {
  let texto = "Historial de Ventas\n\n";
  historialVentas.forEach((venta, i) => {
    texto += `Venta ${i + 1} - ${venta.fecha}\n`;
    venta.productos.forEach(p => {
      texto += `  ${p.cantidad}x ${p.nombre} (T: ${p.talla || "-"}) - S/ ${(p.cantidad * p.precio).toFixed(2)}\n`;
    });
    texto += "\n";
  });

  let blob = new Blob([texto], { type: "text/plain" });
  let enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "historial_ventas.txt";
  enlace.click();
}

// ===============================
// Inventario
// ===============================
function mostrarInventario() {
  let inventario = {};

  historialVentas.forEach(venta => {
    venta.productos.forEach(p => {
      let clave = `${p.nombre}-${p.talla || "sinTalla"}`;
      if (!inventario[clave]) {
        inventario[clave] = { nombre: p.nombre, talla: p.talla || "-", cantidad: 0 };
      }
      inventario[clave].cantidad += p.cantidad;
    });
  });

  let contenedor = document.getElementById("contenedorInventario");
  contenedor.innerHTML = "";

  if (Object.keys(inventario).length === 0) {
    contenedor.innerHTML = "<p>No hay inventario registrado</p>";
    return;
  }

  let tabla = document.createElement("table");
  tabla.innerHTML = `
    <tr>
      <th>Producto</th>
      <th>Talla</th>
      <th>Cantidad Vendida</th>
    </tr>
  `;

  for (let clave in inventario) {
    let fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${inventario[clave].nombre}</td>
      <td>${inventario[clave].talla}</td>
      <td>${inventario[clave].cantidad}</td>
    `;
    tabla.appendChild(fila);
  }

  contenedor.appendChild(tabla);
}

// ===============================
// Reporte de Tallas
// ===============================
function generarReporteTallas() {
  let historial = JSON.parse(localStorage.getItem("historialVentas")) || [];
  let conteoTallas = {};

  historial.forEach(venta => {
    venta.productos.forEach(prod => {
      let talla = prod.talla || "Sin talla";
      conteoTallas[talla] = (conteoTallas[talla] || 0) + prod.cantidad;
    });
  });

  let contenedor = document.getElementById("contenedorTallas");
  contenedor.innerHTML = "";

  if (Object.keys(conteoTallas).length === 0) {
    contenedor.innerHTML = "<p>No hay datos de ventas todavía.</p>";
    return;
  }

  let tabla = document.createElement("table");
  tabla.innerHTML = `
    <tr>
      <th>Talla</th>
      <th>Cantidad Vendida</th>
    </tr>
  `;

  for (let talla in conteoTallas) {
    let fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${talla}</td>
      <td>${conteoTallas[talla]}</td>
    `;
    tabla.appendChild(fila);
  }

  contenedor.appendChild(tabla);
}

// ===============================
// Cambio de secciones
// ===============================
function mostrarSeccion(id) {
  let secciones = document.querySelectorAll(".seccion");
  secciones.forEach(sec => sec.style.display = "none");
  document.getElementById(id).style.display = "block";
}

// ===============================
// Inicialización
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  mostrarCarrito();
});