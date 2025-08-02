let total = 0;
let productosSeleccionados = [];
let prendas = [];

// ✅ Mostrar mensajes en pantalla
function mostrarMensaje(msj, tipo = "info") {
  const contenedor = document.getElementById("lista-prendas");
  if (contenedor) {
    contenedor.innerHTML = `<p style="color:${tipo === 'error' ? 'red' : 'green'}; text-align:center;">${msj}</p>`;
  }
}

// ✅ Formatear soles
const formatearSoles = (valor) => new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN"
}).format(valor);

// ✅ Generar tallas por defecto
function generarTallas(inicio = 4, fin = 16) {
  const tallas = [];
  for (let t = inicio; t <= fin; t += 2) {
    tallas.push({ talla: t, precio: null });
  }
  return tallas;
}

// ✅ Cargar productos desde Firebase (con reintentos)
async function cargarPrendas(reintento = 0) {
  try {
    const snapshot = await db.collection("inventario").get();

    // Solo datos planos
    prendas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    generarVistaPrendas();
  } catch (error) {
    console.error("Error cargando prendas:", error);
    if (reintento < 3) {
      setTimeout(() => cargarPrendas(reintento + 1), 3000);
    } else {
      mostrarMensaje("⚠️ No se pudo conectar a Firestore. Revisa tu conexión.", "error");
    }
  }
}

// ✅ Mostrar productos
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

    const titulo = document.createElement("h3");
    titulo.innerText = `${prenda.nombre} (Stock: ${prenda.stock})`;
    div.appendChild(titulo);

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

    const descDiv = document.createElement("div");
    descDiv.className = "descuentos";
    div.appendChild(descDiv);

    contenedor.appendChild(div);
  });
}

// ✅ Botones de descuento
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

// ✅ Agregar producto y descontar stock
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

// ✅ Guardar carrito en localStorage (protección anti-objetos)
function guardarEnLocalStorage() {
  try {
    // Aseguramos que solo sean strings simples
    const productosPlanos = productosSeleccionados.map(p => String(p));

    // Validación: si algún elemento no es string, lo ignoramos
    const datosSeguros = productosPlanos.filter(p => typeof p === "string");

    localStorage.setItem("total", String(total));
    localStorage.setItem("productos", JSON.stringify(datosSeguros));
  } catch (err) {
    console.warn("⚠️ No se pudo guardar en localStorage. Datos no válidos:", err);
  }
}

// ✅ Actualizar interfaz
function actualizarInterfaz() {
  document.getElementById("total").innerText = `Total: ${formatearSoles(total)}`;
  document.getElementById("productos").innerHTML = productosSeleccionados.map(p => `<li>${p}</li>`).join('');
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

// ✅ Finalizar venta
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
  try {
    localStorage.setItem("historialVentas", JSON.stringify(historial));
  } catch (err) {
    console.warn("⚠️ No se pudo guardar historial:", err);
  }
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
  try {
    return JSON.parse(localStorage.getItem("historialVentas")) || [];
  } catch {
    return [];
  }
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

// ✅ Descargar PDF
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

// ✅ Inicializar
window.onload = async () => {
  const usuario = localStorage.getItem("usuarioActivo");
  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  try {
    total = parseFloat(localStorage.getItem("total")) || 0;
    productosSeleccionados = JSON.parse(localStorage.getItem("productos")) || [];
  } catch {
    total = 0;
    productosSeleccionados = [];
  }

  await cargarPrendas();
  actualizarInterfaz();
  mostrarHistorial(obtenerHistorial());
};