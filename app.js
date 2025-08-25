// ===============================
// Variables globales
// ===============================
let carrito = [];
let historial = JSON.parse(localStorage.getItem("historial")) || [];
let inventario = JSON.parse(localStorage.getItem("inventario")) || [];

// ===============================
// Funciones de Navegación
// ===============================
function mostrarSeccion(seccionId) {
  document.querySelectorAll(".seccion").forEach(sec => sec.style.display = "none");
  document.getElementById(seccionId).style.display = "block";
}

function mostrarHistorial() {
  mostrarSeccion("historial");
  renderHistorial();
}

function mostrarInventario() {
  mostrarSeccion("inventario");
  renderInventario();
}

function mostrarReporteTallas() {
  mostrarSeccion("reporteTallas");
  renderReporteTallas();
}

// ===============================
// Carrito
// ===============================
function agregarProducto() {
  const nombre = document.getElementById("nombreProducto").value.trim();
  const precio = parseFloat(document.getElementById("precioProducto").value);
  const cantidad = parseInt(document.getElementById("cantidadProducto").value);

  if (!nombre || isNaN(precio) || isNaN(cantidad) || cantidad <= 0) {
    alert("Por favor ingresa un producto válido.");
    return;
  }

  const producto = { nombre, precio, cantidad };
  carrito.push(producto);
  actualizarCarrito();

  // limpiar inputs
  document.getElementById("nombreProducto").value = "";
  document.getElementById("precioProducto").value = "";
  document.getElementById("cantidadProducto").value = "";
}

function actualizarCarrito() {
  const lista = document.getElementById("listaCarrito");
  lista.innerHTML = "";

  let total = 0;
  carrito.forEach((p, i) => {
    total += p.precio * p.cantidad;
    const li = document.createElement("li");
    li.textContent = `${p.nombre} - S/.${p.precio.toFixed(2)} x ${p.cantidad}`;
    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "❌";
    btnEliminar.onclick = () => eliminarProducto(i);
    li.appendChild(btnEliminar);
    lista.appendChild(li);
  });

  document.getElementById("totalCarrito").textContent = `Total: S/.${total.toFixed(2)}`;
}

function eliminarProducto(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
}

function reiniciarCarrito() {
  carrito = [];
  actualizarCarrito();
}

function finalizarVenta() {
  if (carrito.length === 0) {
    alert("El carrito está vacío.");
    return;
  }

  const fecha = new Date().toLocaleString();
  const venta = { fecha, productos: [...carrito] };

  // Guardar en historial
  historial.push(venta);
  localStorage.setItem("historial", JSON.stringify(historial));

  // Actualizar inventario
  carrito.forEach(prod => {
    const item = inventario.find(i => i.nombre === prod.nombre);
    if (item) {
      item.cantidad += prod.cantidad;
    } else {
      inventario.push({ nombre: prod.nombre, cantidad: prod.cantidad });
    }
  });
  localStorage.setItem("inventario", JSON.stringify(inventario));

  alert("Venta finalizada ✅");
  reiniciarCarrito();
}

// ===============================
// Historial
// ===============================
function renderHistorial() {
  const contenedor = document.getElementById("contenedorHistorial");
  contenedor.innerHTML = "";

  if (historial.length === 0) {
    contenedor.textContent = "No hay ventas registradas.";
    return;
  }

  historial.forEach((venta, i) => {
    const div = document.createElement("div");
    div.classList.add("venta");
    div.innerHTML = `<strong>Venta ${i + 1}</strong> - ${venta.fecha}<br>` +
      venta.productos.map(p => `${p.nombre} (x${p.cantidad}) - S/.${p.precio}`).join("<br>");
    contenedor.appendChild(div);
  });
}

function borrarHistorial() {
  if (confirm("¿Seguro que deseas borrar el historial?")) {
    historial = [];
    localStorage.removeItem("historial");
    renderHistorial();
  }
}

function descargarHistorial() {
  let texto = "Historial de Ventas:\n\n";
  historial.forEach((venta, i) => {
    texto += `Venta ${i + 1} - ${venta.fecha}\n`;
    venta.productos.forEach(p => {
      texto += `  - ${p.nombre} x${p.cantidad} - S/.${p.precio}\n`;
    });
    texto += "\n";
  });

  const blob = new Blob([texto], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "historial.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// ===============================
// Inventario
// ===============================
function renderInventario() {
  const contenedor = document.getElementById("contenedorInventario");
  contenedor.innerHTML = "";

  if (inventario.length === 0) {
    contenedor.textContent = "Inventario vacío.";
    return;
  }

  inventario.forEach(item => {
    const div = document.createElement("div");
    div.textContent = `${item.nombre} - Cantidad: ${item.cantidad}`;
    contenedor.appendChild(div);
  });
}

// ===============================
// Reporte Tallas
// ===============================
function renderReporteTallas() {
  const contenedor = document.getElementById("contenedorTallas");
  contenedor.innerHTML = "";

  if (inventario.length === 0) {
    contenedor.textContent = "No hay productos en el inventario.";
    return;
  }

  // Agrupar por tallas (ejemplo simple: busca "S", "M", "L", "XL" en el nombre)
  const tallas = { S: 0, M: 0, L: 0, XL: 0 };

  inventario.forEach(item => {
    if (item.nombre.includes("S")) tallas.S += item.cantidad;
    if (item.nombre.includes("M")) tallas.M += item.cantidad;
    if (item.nombre.includes("L")) tallas.L += item.cantidad;
    if (item.nombre.includes("XL")) tallas.XL += item.cantidad;
  });

  for (const talla in tallas) {
    const div = document.createElement("div");
    div.textContent = `${talla}: ${tallas[talla]}`;
    contenedor.appendChild(div);
  }
}