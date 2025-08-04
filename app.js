// =============================
//  Frutisha Store - Firebase
// =============================

// ✅ Variables globales
let total = 0;
let productosSeleccionados = [];
let prendas = [];

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

// =============================
//  Cargar productos
// =============================
async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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

  if (prendas.length === 0) {
    contenedor.innerHTML = "<p>⚠️ No hay productos en el inventario.</p>";
    return;
  }

  prendas.forEach((prenda) => {
    const div = document.createElement("div");
    div.className = "producto-card";

    const titulo = document.createElement("h3");
    titulo.innerText = `${String(prenda.nombre)} (Stock: ${String(prenda.stock)})`;
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

// =============================
//  Botones de descuento
// =============================
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

// =============================
//  Agregar producto y descontar stock
// =============================
async function agregarProducto(prenda, tallaSel, precioFinal) {
  if (prenda.stock <= 0) {
    alert("⚠️ No hay stock disponible para este producto");
    return;
  }

  const productoTexto = `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}`;

  total += Number(precioFinal);
  productosSeleccionados.push(productoTexto);

  try {
    await db.collection("inventario").doc(prenda.id).update({
      stock: prenda.stock - 1
    });
    await cargarPrendas();
  } catch (error) {
    console.error("Error actualizando stock:", error);
  }

  actualizarInterfaz();
}

// =============================
//  Actualizar interfaz carrito
// =============================
function actualizarInterfaz() {
  document.getElementById("total").innerText = `Total: ${formatearSoles(total)}`;
  document.getElementById("productos").innerHTML = productosSeleccionados.map(p => `<li>${p}</li>`).join('');
}

// =============================
//  Reiniciar carrito
// =============================
function reiniciarCarrito() {
  if (!confirm("¿Estás seguro de reiniciar el carrito?")) return;
  total = 0;
  productosSeleccionados = [];
  actualizarInterfaz();
}

// =============================
//  Finalizar venta y guardar en Firebase
// =============================
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return alert("¡Agrega productos primero!");
  const ahora = new Date();

  try {
    await db.collection("ventas").add({
      fecha: ahora.toLocaleDateString("es-PE"),
      hora: ahora.toLocaleTimeString("es-PE"),
      productos: productosSeleccionados.map(p => String(p)),
      total: Number(total)
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
//  Cargar historial desde Firebase
// =============================
async function cargarHistorial() {
  try {
    const snapshot = await db.collection("ventas").orderBy("fecha", "desc").get();
    const historial = snapshot.docs.map(doc => doc.data());

    document.getElementById("ventasDia").innerHTML = historial.map((venta) => `
      <li>
        🗓️ ${venta.fecha} 🕒 ${venta.hora}<br>
        🧾 <strong>${venta.productos.length} productos</strong> - 💵 Total: <strong>${formatearSoles(venta.total)}</strong>
      </li>`).join('');
  } catch (error) {
    console.error("Error cargando historial:", error);
  }
}

// =============================
//  Borrar historial de Firebase
// =============================
async function borrarHistorial() {
  if (!confirm("¿Estás seguro de borrar el historial de ventas?")) return;

  try {
    const snapshot = await db.collection("ventas").get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    document.getElementById("ventasDia").innerHTML = "";
    alert("🗑 Historial eliminado correctamente de Firebase.");
  } catch (error) {
    console.error("Error eliminando historial:", error);
  }
}

// =============================
//  Descargar PDF
// =============================
function descargarPDF() {
  if (productosSeleccionados.length === 0) {
    alert("⚠️ No hay ventas para exportar.");
    return;
  }

  db.collection("ventas").orderBy("fecha", "desc").get()
    .then(snapshot => {
      if (snapshot.empty) {
        alert("⚠️ No hay historial de ventas.");
        return;
      }

      let contenido = `🛍️ Historial de Ventas - Frutisha Store\n\n`;

      snapshot.docs.forEach((doc, index) => {
        const venta = doc.data();
        contenido += `Venta ${index + 1}\nFecha: ${venta.fecha} - Hora: ${venta.hora}\nProductos:\n`;
        venta.productos.forEach(p => {
          contenido += `  - ${p}\n`;
        });
        contenido += `Total: ${formatearSoles(venta.total)}\n---------------------------\n\n`;
      });

      // Creamos un contenedor temporal
      const divTemporal = document.createElement("div");
      divTemporal.style.display = "none";
      divTemporal.innerHTML = `<pre>${contenido}</pre>`;
      document.body.appendChild(divTemporal);

      html2pdf().set({
        margin: 10,
        filename: `ventas_frutisha_${new Date().toLocaleDateString("es-PE")}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(divTemporal).save().then(() => {
        document.body.removeChild(divTemporal);
      });

    })
    .catch(error => {
      console.error("Error generando PDF:", error);
      alert("❌ Ocurrió un error al generar el PDF.");
    });
}
// =============================
//  Inicializar página
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