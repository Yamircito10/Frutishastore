// =============================
//  Frutisha Store - Firebase (stock por talla)
// =============================

// ✅ Variables globales
let total = 0;
let productosSeleccionados = []; // {texto, precio, idPrenda, talla}
let prendas = [];

// ✅ Formatear a soles
const formatearSoles = (valor) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

// ✅ Generar tallas por defecto (con stock)
function generarTallas(inicio = 4, fin = 16) {
  const tallas = [];
  for (let t = inicio; t <= fin; t += 2) {
    tallas.push({ talla: t, precio: null, stock: 0 });
  }
  return tallas;
}

// =============================
//  Cargar productos desde Firebase
// =============================
async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    generarVistaPrendas();
  } catch (error) {
    console.error("Error cargando prendas:", error);
  }
}

// =============================
//  Mostrar productos (desactiva talla sin stock)
// =============================
function generarVistaPrendas() {
  const contenedor = document.getElementById("lista-prendas");
  contenedor.innerHTML = "";

  if (!prendas.length) {
    contenedor.innerHTML = "<p>⚠️ No hay productos en el inventario.</p>";
    return;
  }

  prendas.forEach((prenda) => {
    const div = document.createElement("div");
    div.className = "producto-card";

    const titulo = document.createElement("h3");
    titulo.innerText = `${String(prenda.nombre)} (Stock: ${Number(prenda.stock) || 0})`;
    div.appendChild(titulo);

    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";

    const tallas = Array.isArray(prenda.tallas) && prenda.tallas.length
      ? prenda.tallas
      : generarTallas();

    tallas.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "boton-talla";
      btn.innerText = `T${t.talla}`;

      // 🔒 Desactivar si no hay stock en la talla
      if (!t.stock || Number(t.stock) <= 0) {
        btn.disabled = true;
        btn.style.opacity = 0.5;
        btn.title = "Sin stock en esta talla";
      } else {
        btn.onclick = () => mostrarDescuentos(div, prenda, t);
      }

      tallasDiv.appendChild(btn);
    });

    div.appendChild(tallasDiv);

    const descDiv = document.createElement("div");
    descDiv.className = "descuentos";
    div.appendChild(descDiv);

    contenedor.appendChild(div);
  });
}

// =============================
//  Botones de descuento
// =============================
function mostrarDescuentos(contenedor, prenda, tallaSel) {
  const descDiv = contenedor.querySelector(".descuentos");
  descDiv.innerHTML = "";

  const base = tallaSel.precio != null ? Number(tallaSel.precio) : Number(prenda.precio);
  const precioBase = Number.isFinite(base) ? base : 0;
  const descuentos = [0, 1, 2, 3];

  descuentos.forEach((desc) => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = desc === 0 ? "Sin Desc." : `-S/${desc}`;
    btn.onclick = () => agregarProducto(prenda, tallaSel, precioBase - desc);
    descDiv.appendChild(btn);
  });
}

// =============================
//  Agregar al carrito (descuenta stock de la talla y recalcula general)
// =============================
async function agregarProducto(prenda, tallaSel, precioFinal) {
  if (!tallaSel.stock || Number(tallaSel.stock) <= 0) {
    alert("⚠️ No hay stock disponible en esta talla.");
    return;
  }

  const producto = {
    texto: `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}`,
    precio: Number(precioFinal),
    idPrenda: prenda.id,
    talla: tallaSel.talla,
  };

  productosSeleccionados.push(producto);
  total += producto.precio;

  try {
    // Actualizar stock por talla y stock general
    const tallasActualizadas = (Array.isArray(prenda.tallas) ? prenda.tallas : generarTallas()).map(
      (t) => (t.talla === tallaSel.talla ? { ...t, stock: Math.max(0, (Number(t.stock) || 0) - 1) } : t)
    );
    const stockGeneral = tallasActualizadas.reduce((acc, t) => acc + (Number(t.stock) || 0), 0);

    await db.collection("inventario").doc(prenda.id).update({
      tallas: tallasActualizadas,
      stock: stockGeneral,
    });

    await cargarPrendas();
  } catch (error) {
    console.error("Error actualizando stock:", error);
  }

  actualizarInterfaz();
}

// =============================
//  Eliminar producto del carrito (resta del total y repone stock en Firebase)
// =============================
async function eliminarProducto(index) {
  const producto = productosSeleccionados[index];
  if (!producto) return;

  // Quitar del carrito y total
  total -= Number(producto.precio) || 0;
  productosSeleccionados.splice(index, 1);
  actualizarInterfaz();

  // Reponer stock en Firebase (talla específica + general)
  try {
    const ref = db.collection("inventario").doc(producto.idPrenda);
    const snap = await ref.get();
    if (snap.exists) {
      const prenda = { id: snap.id, ...snap.data() };
      const tallas = Array.isArray(prenda.tallas) ? prenda.tallas : generarTallas();

      const tallasActualizadas = tallas.map((t) =>
        t.talla === producto.talla ? { ...t, stock: (Number(t.stock) || 0) + 1 } : t
      );
      const stockGeneral = tallasActualizadas.reduce((acc, t) => acc + (Number(t.stock) || 0), 0);

      await ref.update({ tallas: tallasActualizadas, stock: stockGeneral });
      await cargarPrendas();
    }
  } catch (error) {
    console.error("Error reponiendo stock:", error);
  }
}

// =============================
//  Mostrar carrito
// =============================
function actualizarInterfaz() {
  document.getElementById("total").innerText = `Total: ${formatearSoles(total)}`;
  const ul = document.getElementById("productos");
  ul.innerHTML = "";
  productosSeleccionados.forEach((prod, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${prod.texto} <button onclick="eliminarProducto(${i})">❌</button>`;
    ul.appendChild(li);
  });
}

// =============================
//  Finalizar venta (guarda en Firebase)
// =============================
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return alert("¡Agrega productos primero!");
  const ahora = new Date();

  try {
    await db.collection("ventas").add({
      fecha: ahora.toLocaleDateString("es-PE"),
      hora: ahora.toLocaleTimeString("es-PE"),
      productos: productosSeleccionados.map((p) => String(p.texto)),
      total: Number(total),
    });

    total = 0;
    productosSeleccionados = [];
    actualizarInterfaz();
    alert("✅ Venta guardada correctamente en Firebase.");
    cargarHistorial();
  } catch (error) {
    console.error("Error guardando venta:", error);
  }
}

// =============================
//  Historial (desde Firebase)
// =============================
async function cargarHistorial() {
  try {
    const snapshot = await db.collection("ventas").orderBy("fecha", "desc").get();
    const historial = snapshot.docs.map((doc) => doc.data());

    document.getElementById("ventasDia").innerHTML = historial
      .map(
        (venta) => `
      <li>
        🗓️ ${venta.fecha} 🕒 ${venta.hora}<br>
        🧾 <strong>${venta.productos.length} productos</strong> - 💵 Total: <strong>${formatearSoles(
          venta.total
        )}</strong>
      </li>`
      )
      .join("");
  } catch (error) {
    console.error("Error cargando historial:", error);
  }
}

// =============================
//  Descargar TXT (historial completo)
// =============================
function descargarTXT() {
  db.collection("ventas")
    .orderBy("fecha", "desc")
    .get()
    .then((snapshot) => {
      if (snapshot.empty) return alert("⚠️ No hay historial de ventas.");

      let contenido = `🛍️ Historial de Ventas - Frutisha Store\n\n`;
      snapshot.forEach((doc, i) => {
        const venta = doc.data();
        contenido += `Venta ${i + 1}\nFecha: ${venta.fecha} - Hora: ${venta.hora}\nProductos:\n`;
        (venta.productos || []).forEach((p) => (contenido += ` - ${p}\n`));
        contenido += `Total: ${formatearSoles(venta.total)}\n------------------------\n\n`;
      });

      const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      enlace.download = `ventas_frutisha_${new Date().toLocaleDateString("es-PE")}.txt`;
      enlace.click();
    })
    .catch((err) => {
      console.error("Error al exportar TXT:", err);
      alert("❌ Error al exportar ventas.");
    });
}

// =============================
//  Borrar historial (Firebase)
// =============================
async function borrarHistorial() {
  if (!confirm("¿Deseas borrar el historial de ventas?")) return;
  try {
    const snapshot = await db.collection("ventas").get();
    const batch = db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    document.getElementById("ventasDia").innerHTML = "";
    alert("🗑 Historial eliminado correctamente.");
  } catch (error) {
    console.error("Error eliminando historial:", error);
  }
}

// =============================
//  Reiniciar carrito
// =============================
function reiniciarCarrito() {
  if (!confirm("¿Deseas reiniciar el carrito?")) return;
  total = 0;
  productosSeleccionados = [];
  actualizarInterfaz();
}

// =============================
//  Inicio
// =============================
window.onload = async () => {
  const usuario = localStorage.getItem("usuarioActivo");
  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  await cargarPrendas();
  await cargarHistorial();
  actualizarInterfaz();
};