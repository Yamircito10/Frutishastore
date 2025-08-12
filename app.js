// =============================
//  Frutisha Store - Firebase (stock por talla)
// =============================

// ✅ Variables globales
let total = 0;
let productosSeleccionados = [];
let prendas = [];

// ✅ Formatear soles
const formatearSoles = (valor) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

// =============================
//  Utilidades
// =============================
function sumaStockTallas(tallas) {
  if (!Array.isArray(tallas)) return 0;
  return tallas.reduce((acc, t) => acc + (Number(t.stockTalla) || 0), 0);
}

// =============================
//  Cargar productos
// =============================
async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map((doc) => {
      const data = doc.data();
      const tallas = Array.isArray(data.tallas) ? data.tallas : [];
      const stockGeneral = sumaStockTallas(tallas) || Number(data.stock) || 0; // compat si aún tienes "stock"
      return {
        id: doc.id,
        nombre: data.nombre || "Sin nombre",
        precio: data.precio, // opcional si todas las tallas tienen precio
        tallas,
        stockGeneral,
      };
    });
    generarVistaPrendas();
  } catch (error) {
    console.error("Error cargando prendas:", error);
  }
}

// =============================
//  Mostrar productos
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
    titulo.innerText = `${prenda.nombre} (Stock: ${prenda.stockGeneral})`;
    div.appendChild(titulo);

    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";

    const tallas = Array.isArray(prenda.tallas) ? prenda.tallas : [];
    if (!tallas.length) {
      const p = document.createElement("p");
      p.style.margin = "6px 0";
      p.textContent = "Sin tallas configuradas";
      div.appendChild(p);
    } else {
      tallas
        .sort((a, b) => (Number(a.talla) || 0) - (Number(b.talla) || 0))
        .forEach((t) => {
          const btn = document.createElement("button");
          btn.className = "boton-talla";
          const stockT = Number(t.stockTalla) || 0;
          btn.innerText = `T${t.talla}${stockT <= 0 ? " (0)" : ""}`;
          btn.disabled = stockT <= 0; // desactivar si no hay stock en esa talla
          btn.title = stockT > 0 ? `Stock talla ${t.talla}: ${stockT}` : "Sin stock";
          btn.onclick = () => mostrarDescuentos(div, prenda, t);
          tallasDiv.appendChild(btn);
        });
    }

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

  const precioBase =
    (tallaSel && typeof tallaSel.precio === "number" ? tallaSel.precio : undefined) ??
    (typeof prenda.precio === "number" ? prenda.precio : undefined);

  if (typeof precioBase !== "number") {
    const aviso = document.createElement("p");
    aviso.style.margin = "6px 0";
    aviso.textContent = "Configura un precio para esta talla o un precio base de la prenda.";
    descDiv.appendChild(aviso);
    return;
  }

  const descuentos = [0, 1, 2, 3];
  descuentos.forEach((d) => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = d === 0 ? "Sin Desc." : `-S/${d}`;
    btn.onclick = () => agregarProducto(prenda, tallaSel, precioBase - d);
    descDiv.appendChild(btn);
  });
}

// =============================
//  Agregar al carrito (descuenta stock de la talla específica)
// =============================
async function agregarProducto(prenda, tallaSel, precioFinal) {
  const stockT = Number(tallaSel.stockTalla) || 0;
  if (stockT <= 0) {
    alert("⚠️ No hay stock disponible en esta talla.");
    return;
  }

  const producto = {
    texto: `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}`,
    precio: Number(precioFinal),
    id: prenda.id,
    talla: tallaSel.talla,
  };

  productosSeleccionados.push(producto);
  total += Number(precioFinal);

  // ↓ Actualizar Firestore: restar 1 a stockTalla de la talla elegida y recalcular stock general
  try {
    const docRef = db.collection("inventario").doc(prenda.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Documento no existe");
    const data = docSnap.data();
    const tallas = Array.isArray(data.tallas) ? data.tallas : [];

    const nuevasTallas = tallas.map((t) =>
      Number(t.talla) === Number(tallaSel.talla)
        ? { ...t, stockTalla: Math.max(0, (Number(t.stockTalla) || 0) - 1) }
        : t
    );
    const nuevoStockGeneral = sumaStockTallas(nuevasTallas);

    await docRef.update({
      tallas: nuevasTallas,
      stock: nuevoStockGeneral, // opcional, por compatibilidad
    });

    await cargarPrendas();
  } catch (error) {
    console.error("Error actualizando stock por talla:", error);
  }

  actualizarInterfaz();
}

// =============================
//  Eliminar producto del carrito (NO repone stock en BD)
//  *Si quieres que reponga stock en Firebase cuando se elimina del carrito,
//   avísame y lo agregamos.
// =============================
function eliminarProducto(index) {
  const producto = productosSeleccionados[index];
  total -= producto.precio;
  productosSeleccionados.splice(index, 1);
  actualizarInterfaz();
}

// =============================
//  UI del carrito
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
//  Finalizar venta → guarda en Firebase (colección "ventas")
// =============================
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return alert("¡Agrega productos primero!");
  const ahora = new Date();

  try {
    await db.collection("ventas").add({
      fecha: ahora.toLocaleDateString("es-PE"),
      hora: ahora.toLocaleTimeString("es-PE"),
      productos: productosSeleccionados.map((p) => p.texto),
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
//  Historial (lee de Firebase)
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
        venta.productos.forEach((p) => (contenido += ` - ${p}\n`));
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
//  Borrar historial
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
//  Reiniciar carrito (solo UI)
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