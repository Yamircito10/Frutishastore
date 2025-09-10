// =============================
//  Frutisha Store - Firebase
// =============================

// ✅ Variables globales
let total = 0;
let productosSeleccionados = [];
let prendas = [];

// ✅ Formatear soles
const formatearSoles = (valor) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

// =============================
//  Cargar productos
// =============================
async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  if (!Array.isArray(prendas) || prendas.length === 0) {
    contenedor.innerHTML = "<p>⚠️ No hay productos en el inventario.</p>";
    return;
  }

  prendas.forEach(prenda => {
    const div = document.createElement("div");
    div.className = "producto-card";

    const titulo = document.createElement("h3");
    titulo.innerText = `${prenda.nombre} (Stock: ${prenda.stock ?? 0})`;
    div.appendChild(titulo);

    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";

    const tallas = Array.isArray(prenda.tallas) ? prenda.tallas : [];
    tallas.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "boton-talla";
      btn.innerText = `T${t.talla}`;
      btn.disabled = (t.stockTalla ?? 0) <= 0;
      btn.title = (t.stockTalla ?? 0) <= 0 ? "Sin stock" : `Stock: ${t.stockTalla}`;
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
//  Descuentos
// =============================
function mostrarDescuentos(contenedor, prenda, tallaSel) {
  const descDiv = contenedor.querySelector(".descuentos");
  descDiv.innerHTML = "";

  const precioBase = (tallaSel.precio ?? prenda.precio);
  const descuentos = [0, 1, 2, 3];

  descuentos.forEach(desc => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = desc === 0 ? "Sin Desc." : `-S/${desc}`;
    btn.onclick = () => agregarProducto(prenda, tallaSel, Number(precioBase) - desc);
    descDiv.appendChild(btn);
  });
}

// =============================
//  Transacción: ajustar stock talla + stock total
// =============================
async function ajustarStock(prendaId, tallaNumero, delta) {
  return db.runTransaction(async (tx) => {
    const ref = db.collection("inventario").doc(prendaId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Prenda no encontrada");

    const data = snap.data();
    const tallas = Array.isArray(data.tallas) ? [...data.tallas] : [];
    const idx = tallas.findIndex(x => Number(x.talla) === Number(tallaNumero));
    if (idx === -1) throw new Error("Talla no encontrada");

    const actual = Number(tallas[idx].stockTalla || 0) + delta;
    if (actual < 0) throw new Error("Sin stock para esta talla");

    tallas[idx].stockTalla = actual;
    const nuevoTotal = tallas.reduce((acc, x) => acc + Number(x.stockTalla || 0), 0);

    tx.update(ref, { tallas, stock: nuevoTotal });
    return { nuevoTotal, tallas };
  });
}

// =============================
//  Agregar al carrito
// =============================
async function agregarProducto(prenda, tallaSel, precioFinal) {
  try {
    await ajustarStock(prenda.id, tallaSel.talla, -1);
    const texto = `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}`;
    productosSeleccionados.push({
      id: prenda.id,
      talla: Number(tallaSel.talla),
      precio: Number(precioFinal),
      texto
    });
    total += Number(precioFinal);

    guardarCarrito();
    await cargarPrendas();
    actualizarInterfaz();
  } catch (error) {
    console.error("Error vendiendo:", error);
    alert("⚠️ No se pudo realizar la venta: " + error.message);
  }
}

// =============================
//  Eliminar del carrito
// =============================
async function eliminarProducto(index) {
  const prod = productosSeleccionados[index];
  if (!prod) return;
  try {
    await ajustarStock(prod.id, prod.talla, +1);
    total -= Number(prod.precio);
    productosSeleccionados.splice(index, 1);

    guardarCarrito();
    await cargarPrendas();
    actualizarInterfaz();
  } catch (error) {
    console.error("Error reponiendo stock:", error);
    alert("⚠️ No se pudo reponer el stock: " + error.message);
  }
}

// =============================
//  Guardar y cargar carrito
// =============================
function guardarCarrito() {
  try {
    localStorage.setItem("carrito", JSON.stringify({
      productos: productosSeleccionados,
      total
    }));
  } catch (e) {
    console.error("Error guardando carrito:", e);
  }
}

function cargarCarrito() {
  try {
    const data = localStorage.getItem("carrito");
    if (data) {
      const { productos, total: t } = JSON.parse(data);
      productosSeleccionados = Array.isArray(productos) ? productos : [];
      total = typeof t === "number" ? t : 0;
    }
  } catch (e) {
    console.error("Error cargando carrito, se limpiará automáticamente:", e);
    localStorage.removeItem("carrito");
    productosSeleccionados = [];
    total = 0;
  }
}

// =============================
//  Reiniciar carrito (también limpia localStorage)
// =============================
function reiniciarCarrito() {
  if (!confirm("¿Deseas reiniciar el carrito?")) return;
  total = 0;
  productosSeleccionados = [];
  localStorage.removeItem("carrito");
  actualizarInterfaz();
}

// =============================
//  Borrar historial
// =============================
async function borrarHistorial() {
  if (!confirm("¿Deseas borrar el historial de ventas?")) return;
  try {
    const snap = await db.collection("ventas").get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    document.getElementById("ventasDia").innerHTML = "";
    alert("🗑 Historial eliminado.");
  } catch (err) {
    console.error("Error eliminando historial:", err);
    alert("⚠️ No se pudo borrar el historial.");
  }
}

// =============================
//  Carrito / UI
// =============================
function actualizarInterfaz() {
  document.getElementById("total").innerText = `Total: ${formatearSoles(total)}`;
  const ul = document.getElementById("productos");
  ul.innerHTML = "";
  productosSeleccionados.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${p.texto} <button onclick="eliminarProducto(${i})">❌</button>`;
    ul.appendChild(li);
  });
}

// =============================
//  Finalizar venta
// =============================
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return alert("¡Agrega productos primero!");
  const ahora = new Date();
  try {
    await db.collection("ventas").add({
      fecha: ahora.toLocaleDateString("es-PE"),
      hora: ahora.toLocaleTimeString("es-PE"),
      productos: productosSeleccionados.map(p => p.texto),
      total: Number(total)
    });
    total = 0;
    productosSeleccionados = [];
    guardarCarrito();
    actualizarInterfaz();
    alert("✅ Venta guardada correctamente.");
    cargarHistorial();
  } catch (err) {
    console.error("Error guardando venta:", err);
    alert("❌ Error guardando venta.");
  }
}

// =============================
//  Historial
// =============================
async function cargarHistorial() {
  try {
    const snapshot = await db.collection("ventas").orderBy("fecha", "desc").get();
    const historial = snapshot.docs.map(doc => doc.data());
    document.getElementById("ventasDia").innerHTML = historial.map(v => `
      <li>
        🗓️ ${v.fecha} 🕒 ${v.hora}<br>
        🧾 <strong>${v.productos.length} productos</strong> - 💵 Total: <strong>${formatearSoles(v.total)}</strong>
      </li>
    `).join('');
  } catch (error) {
    console.error("Error cargando historial:", error);
  }
}

// =============================
//  Inicializar
// =============================
window.onload = async () => {
  const usuario = localStorage.getItem("usuarioActivo");
  if (!usuario) {
    window.location.href = "login.html";
    return;
  }
  cargarCarrito();
  await cargarPrendas();
  await cargarHistorial();
  actualizarInterfaz();
};
function cargarInventario(){ console.log('TODO: cargar inventario'); }

function cargarVentas(){ console.log('TODO: cargar ventas'); }
