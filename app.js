// ===============================
// VARIABLES GLOBALES
// ===============================
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let historial = JSON.parse(localStorage.getItem("historial")) || [];
let inventario = JSON.parse(localStorage.getItem("inventario")) || [];

// ===============================
// FUNCIONES DE INTERFAZ
// ===============================
function mostrarSeccion(id) {
  document.querySelectorAll(".seccion").forEach(sec => {
    sec.style.display = "none";
  });
  document.getElementById(id).style.display = "block";
}

// ===============================
// CARRITO
// ===============================
function agregarAlCarrito() {
  const producto = document.getElementById("producto").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const cantidad = parseInt(document.getElementById("cantidad").value);

  if (!producto || isNaN(precio) || isNaN(cantidad) || cantidad <= 0) {
    alert("Por favor ingresa datos válidos.");
    return;
  }

  carrito.push({ producto, precio, cantidad });
  guardarCarrito();
  mostrarCarrito();

  // limpiar inputs
  document.getElementById("producto").value = "";
  document.getElementById("precio").value = "";
  document.getElementById("cantidad").value = 1;
}

function mostrarCarrito() {
  const lista = document.getElementById("listaCarrito");
  const totalCarrito = document.getElementById("totalCarrito");
  lista.innerHTML = "";

  let total = 0;
  carrito.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${item.cantidad} x ${item.producto} - S/ ${(item.precio * item.cantidad).toFixed(2)}`;
    lista.appendChild(li);
    total += item.precio * item.cantidad;
  });

  totalCarrito.textContent = `Total: S/ ${total.toFixed(2)}`;
}

function reiniciarCarrito() {
  if (confirm("¿Seguro que quieres reiniciar el carrito?")) {
    carrito = [];
    guardarCarrito();
    mostrarCarrito();
  }
}

function finalizarVenta() {
  if (carrito.length === 0) {
    alert("El carrito está vacío.");
    return;
  }

  const fecha = new Date().toLocaleString();
  historial.push({ fecha, items: [...carrito] });

  // Actualizar inventario
  carrito.forEach(item => {
    const existente = inventario.find(p => p.producto === item.producto);
    if (existente) {
      existente.cantidad += item.cantidad;
    } else {
      inventario.push({ producto: item.producto, cantidad: item.cantidad });
    }
  });

  carrito = [];
  guardarCarrito();
  guardarHistorial();
  guardarInventario();
  mostrarCarrito();
  mostrarHistorial();
  mostrarInventario();
  mostrarReporteTallas();

  alert("Venta finalizada con éxito ✅");
}

// ===============================
// HISTORIAL
// ===============================
function mostrarHistorial() {
  const lista = document.getElementById("listaHistorial");
  lista.innerHTML = "";

  historial.forEach((venta, i) => {
    const div = document.createElement("div");
    div.className = "venta";
    div.innerHTML = `<strong>${venta.fecha}</strong><br>` +
      venta.items.map(it => `${it.cantidad} x ${it.producto} (S/ ${it.precio})`).join("<br>");
    lista.appendChild(div);
  });
}

function borrarHistorial() {
  if (confirm("¿Seguro que quieres borrar todo el historial?")) {
    historial = [];
    guardarHistorial();
    mostrarHistorial();
  }
}

function descargarHistorial() {
  if (historial.length === 0) {
    alert("No hay historial para descargar.");
    return;
  }

  let contenido = "Historial de Ventas:\n\n";
  historial.forEach(venta => {
    contenido += `Fecha: ${venta.fecha}\n`;
    venta.items.forEach(it => {
      contenido += `  - ${it.cantidad} x ${it.producto} (S/ ${it.precio})\n`;
    });
    contenido += "\n";
  });

  const blob = new Blob([contenido], { type: "text/plain" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "historial_ventas.txt";
  enlace.click();
}

// ===============================
// INVENTARIO
// ===============================
function mostrarInventario() {
  const lista = document.getElementById("listaInventario");
  lista.innerHTML = "";

  inventario.forEach(item => {
    const div = document.createElement("div");
    div.textContent = `${item.producto}: ${item.cantidad} unidades`;
    lista.appendChild(div);
  });
}

// ===============================
// REPORTE POR TALLAS
// ===============================
function mostrarReporteTallas() {
  const lista = document.getElementById("listaTallas");
  lista.innerHTML = "";

  const resumen = {};
  inventario.forEach(item => {
    // si el producto tiene una "talla" incluida en el nombre (ej: Polo M)
    const partes = item.producto.split(" ");
    const talla = partes[partes.length - 1].toUpperCase();
    if (!resumen[talla]) resumen[talla] = 0;
    resumen[talla] += item.cantidad;
  });

  for (let talla in resumen) {
    const div = document.createElement("div");
    div.textContent = `Talla ${talla}: ${resumen[talla]} unidades`;
    lista.appendChild(div);
  }
}

// ===============================
// LOCALSTORAGE
// ===============================
function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}
function guardarHistorial() {
  localStorage.setItem("historial", JSON.stringify(historial));
}
function guardarInventario() {
  localStorage.setItem("inventario", JSON.stringify(inventario));
}

// ===============================
// INICIO
// ===============================
window.onload = () => {
  mostrarSeccion("carrito");
  mostrarCarrito();
  mostrarHistorial();
  mostrarInventario();
  mostrarReporteTallas();
};