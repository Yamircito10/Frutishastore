let total = 0;
let productosSeleccionados = [];
let prendas = [];

// ✅ Formatear soles
const formatearSoles = (valor) => new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN"
}).format(valor);

// ✅ Generar tallas por defecto (si no existen en Firebase)
function generarTallas(inicio = 4, fin = 16) {
  const tallas = [];
  for (let t = inicio; t <= fin; t += 2) {
    tallas.push({ talla: t, precio: null });
  }
  return tallas;
}

// ✅ Cargar productos desde Firebase con manejo de errores y reintento
async function cargarPrendas(reintento = 0) {
  try {
    const snapshot = await db.collection("inventario").get({ source: "default" });
    prendas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    generarVistaPrendas();
  } catch (error) {
    console.error("Error cargando prendas:", error);
    if (reintento < 3) {
      console.warn(`🔄 Reintentando conexión... (${reintento + 1})`);
      setTimeout(() => cargarPrendas(reintento + 1), 3000);
    } else {
      alert("⚠️ No se pudo conectar con el servidor de inventario. Verifica tu conexión.");
    }
  }
}

// ✅ Mostrar las prendas en la tienda
function generarVistaPrendas() {
  const contenedor = document.getElementById("lista-prendas");
  contenedor.innerHTML = "";

  if (prendas.length === 0) {
    contenedor.innerHTML = "<p>⚠️ No hay productos en el inventario.</p>";
    return;
  }

  prendas.forEach((prenda) => {
    const div = document.createElement("div");
    div.className = "producto-card";

    // Nombre y stock
    const titulo = document.createElement("h3");
    titulo.innerText = `${prenda.nombre} (Stock: ${prenda.stock})`;
    div.appendChild(titulo);

    // Botones de tallas
    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";

    let tallas = prenda.tallas || generarTallas();
    tallas.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "boton-talla";
      btn.innerText = `T${t.talla}`;
      btn.onclick = () => mostrarDescuentos(div, prenda, t);
      tallasDiv.appendChild(btn);
    });

    div.appendChild(tallasDiv);

    // Div para descuentos dinámicos
    const descDiv = document.createElement("div");
    descDiv.className = "descuentos";
    div.appendChild(descDiv);

    contenedor.appendChild(div);
  });
}

// ✅ Mostrar botones de descuento
function mostrarDescuentos(contenedor, prenda, tallaSel) {
  const descDiv = contenedor.querySelector(".descuentos");
  descDiv.innerHTML = "";

  const precioBase = tallaSel.precio ?? prenda.precio;
  const descuentos = [0, 1, 2, 3];

  descuentos.forEach(d => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = d === 0 ? "Sin Descuento" : `-S/${d}`;
    btn.onclick = () => agregarProducto(prenda, tallaSel, precioBase - d);
    descDiv.appendChild(btn);
  });
}

// ✅ Agregar producto al carrito y descontar stock
async function agregarProducto(prenda, tallaSel, precioFinal) {
  if (prenda.stock <= 0) {
    alert("⚠️ No hay stock disponible para este producto");
    return;
  }

  total += precioFinal;
  productosSeleccionados.push(`${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}`);

  try {
    await db.collection("inventario").doc(prenda.id).update({
      stock: prenda.stock - 1
    });
    await cargarPrendas();
  } catch (error) {
    console.error("Error actualizando stock:", error);
  }

  guardarEnLocalStorage();
  actualizarInterfaz();
}

// ✅ Actualizar la interfaz del carrito
function actualizarInterfaz() {
  document.getElementById("total").innerText = `Total: ${formatearSoles(total)}`;
  document.getElementById("productos").innerHTML = productosSeleccionados.map(p => `<li>${p}</li>`).join('');
}

function guardarEnLocalStorage() {
  // Solo guardamos datos simples para evitar errores circulares
  localStorage.setItem("total", total);
  localStorage.setItem("productos", JSON.stringify([...productosSeleccionados]));
}

// ✅ Reiniciar carrito
function reiniciarCarrito() {
  if (!confirm("¿Estás seguro de reiniciar el carrito?")) return;
  total = 0;
  productosSeleccionados = [];
  localStorage.removeItem("total");
  localStorage.removeItem("productos");
  actualizarInterfaz();
}

// ✅ Finalizar venta (guarda historial del día en localStorage)
function finalizarVenta() {
  if (productosSeleccionados.length === 0) return alert("¡Agrega productos primero!");
  const historial = obtenerHistorial();
  const ahora = new Date();
  historial.push({
    fecha: ahora.toLocaleDateString("es-PE"),
    hora: ahora.toLocaleTimeString("es-PE"),
    productos: [...productosSeleccionados],
    total
  });
  localStorage.setItem("historialVentas", JSON.stringify(historial));
  total = 0;
  productosSeleccionados = [];
  localStorage.removeItem("total");
  localStorage.removeItem("productos");
  actualizarInterfaz();
  mostrarHistorial(historial);
  alert("✅ Venta guardada correctamente.");
}

// ✅ Historial
function obtenerHistorial() {
  return JSON.parse(localStorage.getItem("historialVentas")) || [];
}

function mostrarHistorial(historial) {
  document.getElementById("ventasDia").innerHTML = historial.map((venta) => `
    <li>
      🗓️ ${venta.fecha} 🕒 ${venta.hora}<br>
      🧾 <strong>${venta.productos.length} productos</strong> - 💵 Total: <strong>${formatearSoles(venta.total)}</strong>
    </li>`).join('');
}

// ✅ Borrar historial
function borrarHistorial() {
  if (!confirm("¿Estás seguro de borrar el historial?")) return;
  localStorage.removeItem("historialVentas");
  mostrarHistorial([]);
  alert("🗑 Historial eliminado correctamente.");
}

// ✅ Descargar PDF corregido
function descargarPDF() {
  const historial = obtenerHistorial();
  if (historial.length === 0) {
    alert("⚠️ No hay ventas para exportar.");
    return;
  }

  let contenido = `🛍️ Historial de Ventas - Frutisha Store\n\n`;
  historial.forEach((venta, i) => {
    contenido += `Venta ${i + 1}\nFecha: ${venta.fecha} - Hora: ${venta.hora}\nProductos:\n`;
    venta.productos.forEach(p => contenido += `  - ${p}\n`);
    contenido += `Total: ${formatearSoles(venta.total)}\n---------------------------\n\n`;
  });

  const elemento = document.createElement("div");
  elemento.style.display = "none";
  elemento.innerHTML = `<pre>${contenido}</pre>`;
  document.body.appendChild(elemento);

  html2pdf().set({
    margin: 10,
    filename: `ventas_peru_${new Date().toLocaleDateString("es-PE")}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(elemento).save()
    .then(() => {
      document.body.removeChild(elemento);
    });
}

// ✅ Inicializar página
window.onload = async () => {
  const usuario = localStorage.getItem("usuarioActivo");
  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  total = parseFloat(localStorage.getItem("total")) || 0;
  productosSeleccionados = JSON.parse(localStorage.getItem("productos")) || [];

  await cargarPrendas();
  actualizarInterfaz();
  mostrarHistorial(obtenerHistorial());
};