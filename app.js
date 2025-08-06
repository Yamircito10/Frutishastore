// ============================= //  Frutisha Store - Firebase // =============================

let total = 0; let productosSeleccionados = []; let prendas = [];

const formatearSoles = (valor) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

function generarTallas(inicio = 4, fin = 16) { const tallas = []; for (let t = inicio; t <= fin; t += 2) { tallas.push({ talla: t, precio: null }); } return tallas; }

async function cargarPrendas() { try { const snapshot = await db.collection("inventario").get(); prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); generarVistaPrendas(); } catch (error) { console.error("Error cargando prendas:", error); } }

function generarVistaPrendas() { const contenedor = document.getElementById("lista-prendas"); contenedor.innerHTML = "";

if (prendas.length === 0) { contenedor.innerHTML = "<p>⚠️ No hay productos en el inventario.</p>"; return; }

prendas.forEach((prenda) => { const div = document.createElement("div"); div.className = "producto-card";

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

}); }

function mostrarDescuentos(contenedor, prenda, tallaSel) { const descDiv = contenedor.querySelector(".descuentos"); descDiv.innerHTML = "";

const precioBase = tallaSel.precio ?? prenda.precio; const descuentos = [0, 1, 2, 3];

descuentos.forEach(d => { const btn = document.createElement("button"); btn.className = "descuento-btn"; btn.innerText = d === 0 ? "Sin Descuento" : -S/${d}; btn.onclick = () => agregarProducto(prenda, tallaSel, precioBase - d); descDiv.appendChild(btn); }); }

async function agregarProducto(prenda, tallaSel, precioFinal) { if (prenda.stock <= 0) { alert("⚠️ No hay stock disponible para este producto"); return; }

const producto = { texto: ${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}, precio: precioFinal, id: prenda.id };

total += precioFinal; productosSeleccionados.push(producto);

try { await db.collection("inventario").doc(prenda.id).update({ stock: prenda.stock - 1 }); await cargarPrendas(); } catch (error) { console.error("Error actualizando stock:", error); }

actualizarInterfaz(); }

function actualizarInterfaz() { document.getElementById("total").innerText = Total: ${formatearSoles(total)};

const ul = document.getElementById("productos"); ul.innerHTML = "";

productosSeleccionados.forEach((p, index) => { const li = document.createElement("li"); li.textContent = p.texto;

const eliminarBtn = document.createElement("button");
eliminarBtn.textContent = "❌";
eliminarBtn.style.marginLeft = "8px";
eliminarBtn.onclick = () => eliminarProducto(index);

li.appendChild(eliminarBtn);
ul.appendChild(li);

}); }

async function eliminarProducto(index) { const producto = productosSeleccionados[index]; total -= producto.precio; productosSeleccionados.splice(index, 1);

try { await db.collection("inventario").doc(producto.id).update({ stock: firebase.firestore.FieldValue.increment(1) }); await cargarPrendas(); } catch (error) { console.error("Error restaurando stock:", error); }

actualizarInterfaz(); }

function reiniciarCarrito() { if (!confirm("¿Estás seguro de reiniciar el carrito?")) return; total = 0; productosSeleccionados = []; actualizarInterfaz(); }

async function finalizarVenta() { if (productosSeleccionados.length === 0) return alert("¡Agrega productos primero!"); const ahora = new Date();

try { await db.collection("ventas").add({ fecha: ahora.toLocaleDateString("es-PE"), hora: ahora.toLocaleTimeString("es-PE"), productos: productosSeleccionados.map(p => p.texto), total: Number(total) });

total = 0;
productosSeleccionados = [];
actualizarInterfaz();
alert("✅ Venta guardada correctamente en Firebase.");
cargarHistorial();

} catch (error) { console.error("Error guardando venta:", error); } }

async function cargarHistorial() { try { const snapshot = await db.collection("ventas").orderBy("fecha", "desc").get(); const historial = snapshot.docs.map(doc => doc.data());

document.getElementById("ventasDia").innerHTML = historial.map((venta) => `
  <li>
    🗓️ ${venta.fecha} 🕒 ${venta.hora}<br>
    🧾 <strong>${venta.productos.length} productos</strong> - 💵 Total: <strong>${formatearSoles(venta.total)}</strong>
  </li>`).join('');

} catch (error) { console.error("Error cargando historial:", error); } }

async function borrarHistorial() { if (!confirm("¿Estás seguro de borrar el historial de ventas?")) return;

try { const snapshot = await db.collection("ventas").get(); const batch = db.batch(); snapshot.forEach(doc => batch.delete(doc.ref)); await batch.commit();

document.getElementById("ventasDia").innerHTML = "";
alert("🗑 Historial eliminado correctamente de Firebase.");

} catch (error) { console.error("Error eliminando historial:", error); } }

window.onload = async () => { const usuario = localStorage.getItem("usuarioActivo"); if (!usuario) { window.location.href = "login.html"; return; }

await cargarPrendas(); await cargarHistorial(); actualizarInterfaz(); };

