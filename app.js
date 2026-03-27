// ==========================================
//  FRUTISHA STORE - CEREBRO SPA (app.js)
// ==========================================

let total = 0;
let productosSeleccionados = [];
let prendas = [];

const formatearSoles = (valor) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

function notificar(mensaje, tipo = "exito") {
  let colorFondo = tipo === "exito" ? "#2ecc71" : tipo === "error" ? "#e74c3c" : "#f39c12";
  Toastify({ text: mensaje, duration: 2500, gravity: "bottom", position: "center", style: { background: colorFondo, borderRadius: "10px", fontWeight: "bold", fontSize: "15px", boxShadow: "0 4px 6px rgba(0,0,0,0.2)" } }).showToast();
}

// ==========================================
// 1. LÓGICA DE LA TIENDA Y CARRITO
// ==========================================
async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    generarVistaPrendas();
  } catch (error) { notificar("❌ Error cargando el inventario.", "error"); }
}

function generarVistaPrendas() {
  const contenedor = document.getElementById("lista-prendas");
  if(!contenedor) return;
  contenedor.innerHTML = "";
  if (prendas.length === 0) return contenedor.innerHTML = "<p>⚠️ No hay productos.</p>";

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
      btn.onclick = () => mostrarDescuentos(div, prenda, t);
      tallasDiv.appendChild(btn);
    });

    div.appendChild(tallasDiv);
    const descDiv = document.createElement("div");
    descDiv.className = "descuentos";
    div.appendChild(descDiv);
    contenedor.appendChild(div);
  });
  filtrarPrendas();
}

function filtrarPrendas() {
  const input = document.getElementById("buscador-prendas");
  if (!input) return;
  const textoFiltro = input.value.toLowerCase();
  document.querySelectorAll(".producto-card").forEach(tarjeta => {
    tarjeta.style.display = tarjeta.querySelector("h3").innerText.toLowerCase().includes(textoFiltro) ? "flex" : "none";
  });
}

function mostrarDescuentos(contenedor, prenda, tallaSel) {
  const descDiv = contenedor.querySelector(".descuentos");
  descDiv.innerHTML = "";
  const precioBase = (tallaSel.precio ?? prenda.precio);
  [0, 1, 2, 3].forEach(desc => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = desc === 0 ? `S/${precioBase}` : `-S/${desc}`;
    btn.onclick = () => agregarProducto(prenda, tallaSel, Number(precioBase) - desc);
    descDiv.appendChild(btn);
  });
}

async function ajustarStock(prendaId, tallaNumero, delta) {
  return db.runTransaction(async (tx) => {
    const ref = db.collection("inventario").doc(prendaId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Prenda no encontrada");
    const data = snap.data();
    const tallas = Array.isArray(data.tallas) ? [...data.tallas] : [];
    const idx = tallas.findIndex(x => String(x.talla).trim().toUpperCase() === String(tallaNumero).trim().toUpperCase());
    if (idx === -1) throw new Error("Talla no encontrada en base de datos");
    const actual = Number(tallas[idx].stockTalla || 0) + delta;
    if (actual < 0) throw new Error("Sin stock suficiente");
    tallas[idx].stockTalla = actual;
    const nuevoTotal = tallas.reduce((acc, x) => acc + Number(x.stockTalla || 0), 0);
    tx.update(ref, { tallas, stock: nuevoTotal });
    return { nuevoTotal, tallas };
  });
}

async function agregarProducto(prenda, tallaSel, precioFinal) {
  try {
    const res = await ajustarStock(prenda.id, tallaSel.talla, -1);
    const idx = prendas.findIndex(p => p.id === prenda.id);
    if (idx !== -1) { prendas[idx].tallas = res.tallas; prendas[idx].stock = res.nuevoTotal; }
    productosSeleccionados.push({ id: prenda.id, nombre: prenda.nombre, talla: tallaSel.talla, precio: Number(precioFinal), texto: `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}` });
    total += Number(precioFinal);
    guardarCarrito(); generarVistaPrendas(); actualizarInterfaz();
    notificar(`🛒 ${prenda.nombre} T${tallaSel.talla} agregado`, "exito");
  } catch (error) { notificar("⚠️ No se pudo agregar: " + error.message, "error"); }
}

async function eliminarProducto(index) {
  const prod = productosSeleccionados[index];
  if (!prod) return;
  try {
    const res = await ajustarStock(prod.id, prod.talla, +1);
    const idx = prendas.findIndex(p => p.id === prod.id);
    if (idx !== -1) { prendas[idx].tallas = res.tallas; prendas[idx].stock = res.nuevoTotal; }
    total -= Number(prod.precio);
    productosSeleccionados.splice(index, 1);
    guardarCarrito(); generarVistaPrendas(); actualizarInterfaz();
    notificar("🗑️ Producto retirado", "advertencia");
  } catch (error) { notificar("⚠️ Error devolviendo stock", "error"); }
}

function actualizarInterfaz() {
  const totalDiv = document.getElementById("total");
  if(totalDiv) totalDiv.innerText = `Total: ${formatearSoles(total)}`;
  const ul = document.getElementById("productos");
  if(ul) {
    ul.innerHTML = "";
    productosSeleccionados.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span style="flex:1;">${p.texto}</span><button style="background:#ff7675; border:none; color:white; border-radius:5px; padding:5px 10px; cursor:pointer;" onclick="eliminarProducto(${i})">❌</button>`;
      ul.appendChild(li);
    });
  }
}

function guardarCarrito() { localStorage.setItem("carrito", JSON.stringify({ productos: productosSeleccionados, total })); }
function cargarCarrito() {
  try {
    const data = localStorage.getItem("carrito");
    if (data) { const parsed = JSON.parse(data); productosSeleccionados = parsed.productos || []; total = parsed.total || 0; }
  } catch (e) { productosSeleccionados = []; total = 0; }
}

function reiniciarCarrito() {
  if (productosSeleccionados.length === 0) return notificar("El carrito ya está vacío", "advertencia");
  if (!confirm("¿Vaciar carrito? No se devolverá el stock automáticamente.")) return;
  total = 0; productosSeleccionados = []; localStorage.removeItem("carrito"); actualizarInterfaz(); notificar("🔄 Carrito vaciado", "exito");
}

async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return notificar("⚠️ Agrega productos", "advertencia");
  const btn = document.querySelector(".btn-finalizar");
  btn.innerText = "⏳ Procesando..."; btn.disabled = true;
  
  try {
    await db.collection("ventas").add({
      fechaServidor: firebase.firestore.FieldValue.serverTimestamp(),
      fechaTexto: new Date().toLocaleDateString("es-PE"),
      hora: new Date().toLocaleTimeString("es-PE"),
      productos: productosSeleccionados,
      total: Number(total)
    });

    let textoWa = `*🛍️ FRUTISHA STORE*\n`;
    textoWa += `¡Gracias por tu compra!\n\n`;
    textoWa += `*Detalle de tu pedido:*\n`;
    productosSeleccionados.forEach(p => {
      textoWa += `▪️ ${p.nombre} (Talla ${p.talla}) -> ${formatearSoles(p.precio)}\n`;
    });
    textoWa += `\n*Total Pagado: ${formatearSoles(total)}*\n`;
    textoWa += `\n¡Vuelve pronto! ✨`;

    if(confirm("✅ Venta registrada correctamente.\n\n¿Deseas enviar el recibo al cliente por WhatsApp?")) {
      const urlWa = `https://wa.me/?text=${encodeURIComponent(textoWa)}`;
      window.open(urlWa, '_blank');
    }

    total = 0; productosSeleccionados = []; guardarCarrito(); actualizarInterfaz();
    notificar("✅ ¡Venta finalizada exitosamente!", "exito");
  } catch (err) { 
    notificar("❌ Error guardando la venta", "error"); 
  } finally { 
    btn.innerText = "💰 FINALIZAR VENTA"; btn.disabled = false; 
  }
}

// ==========================================
// 2. MAGIA DE LA NAVEGACIÓN SPA
// ==========================================
window.navegarSPA = function(idDestino) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('pantalla-activa'));
  document.getElementById(idDestino).classList.add('pantalla-activa');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (idDestino === 'vista-historial') cargarHistorialSPA();
  if (idDestino === 'vista-ventas') cargarReporteVentasSPA();
  if (idDestino === 'vista-tallas') cargarReporteTallasSPA();
  if (idDestino === 'vista-inventario') cargarInventarioSPA();
};

async function cargarHistorialSPA() {
  const ul = document.getElementById("ventasDia");
  ul.innerHTML = "<li style='text-align:center;'>⏳ Buscando ventas...</li>";
  try {
    const snap = await db.collection("ventas").orderBy("fechaServidor", "desc").limit(30).get();
    if(snap.empty) return ul.innerHTML = "<li style='text-align:center;'>No hay ventas aún.</li>";
    ul.innerHTML = snap.docs.map(doc => {
      const v = doc.data();
      return `<li>
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">📅 ${v.fechaTexto} - 🕒 ${v.hora}</div>
          <div style="font-weight: bold;">${v.productos.map(p => p.texto || p.nombre).join(" | ")}</div>
          <div style="color: #27ae60; font-weight: bold; text-align: right; margin-top: 5px;">Total: ${formatearSoles(v.total)}</div>
        </li>`;
    }).join('');
  } catch (e) { ul.innerHTML = "<li>Error cargando historial</li>"; }
}

async function cargarReporteVentasSPA() {
  const div = document.getElementById("kpis-ventas");
  try {
    const snap = await db.collection("ventas").get();
    let totalHistorico = 0; let ventasPorDia = {};
    snap.forEach(doc => {
      let v = doc.data(); totalHistorico += v.total;
      let fecha = v.fechaTexto || "Sin fecha";
      ventasPorDia[fecha] = (ventasPorDia[fecha] || 0) + v.total;
    });
    let html = `<div style="background: #27ae60; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                  <h3 style="margin:0;">Ventas Históricas</h3><h1 style="margin:5px 0 0 0; font-size: 2.5rem;">${formatearSoles(totalHistorico)}</h1>
                </div><h3>💰 Resumen por Día</h3><ul style="list-style:none; padding:0;">`;
    for (let fecha in ventasPorDia) {
      html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; display: flex; justify-content: space-between; color: #333;">
                <strong>📅 ${fecha}</strong> <span style="color:#d63384; font-weight:bold;">${formatearSoles(ventasPorDia[fecha])}</span></li>`;
    }
    div.innerHTML = html + `</ul>`;
  } catch (e) { div.innerHTML = "<p>Error cargando ventas.</p>"; }
}

async function cargarReporteTallasSPA() {
  const div = document.getElementById("kpis-tallas");
  try {
    const snap = await db.collection("ventas").get();
    let conteoTallas = {};
    snap.forEach(doc => doc.data().productos.forEach(p => conteoTallas[p.talla || "Única"] = (conteoTallas[p.talla || "Única"] || 0) + 1));
    let html = `<ul style="list-style:none; padding:0;">`;
    for (let t in conteoTallas) {
      html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; border-left: 5px solid #3498db; display: flex; justify-content: space-between; color: #333;">
                <strong>Talla ${t}</strong> <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 20px;">Vendidos: ${conteoTallas[t]}</span></li>`;
    }
    div.innerHTML = Object.keys(conteoTallas).length > 0 ? html + `</ul>` : "<p>Aún no hay datos.</p>";
  } catch (e) { div.innerHTML = "<p>Error cargando tallas.</p>"; }
}

// ==========================================
// 3. LÓGICA DE ADMINISTRACIÓN DE INVENTARIO
// ==========================================
async function cargarInventarioSPA() {
  const div = document.getElementById("admin-inventario");
  div.innerHTML = "<p>⏳ Cargando almacén...</p>";
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if(prendas.length === 0) return div.innerHTML = "<p>No hay prendas registradas.</p>";

    let html = `<ul style="list-style:none; padding:0;">`;
    prendas.forEach(p => {
      let stockColor = p.stock > 5 ? '#27ae60' : (p.stock > 0 ? '#f39c12' : '#e74c3c');
      html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; border-left: 5px solid ${stockColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #333;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong>${p.nombre}</strong> 
                    <span style="color: ${stockColor}; font-weight: bold;">Stock: ${p.stock || 0}</span>
                </div>
                <div style="font-size: 13px; color: #666; margin-bottom: 10px;">
                  Precio Base: S/${p.precio} | Tallas: ${p.tallas ? p.tallas.map(t => `T${t.talla}(${t.stockTalla})`).join(', ') : 'Ninguna'}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="eliminarPrendaAdmin('${p.id}')" style="background: #e74c3c; color: white; border: none; padding: 8px; border-radius: 5px; flex: 1; cursor: pointer; font-weight: bold;">🗑️</button>
                    <button onclick="abrirEdicionInfo('${p.id}')" style="background: #f39c12; color: white; border: none; padding: 8px; border-radius: 5px; flex: 1; cursor: pointer; font-weight: bold;">✏️ Info</button>
                    <button onclick="abrirEdicionStock('${p.id}')" style="background: #3498db; color: white; border: none; padding: 8px; border-radius: 5px; flex: 1; cursor: pointer; font-weight: bold;">📦 Stock</button>
                </div>
               </li>`;
    });
    div.innerHTML = html + `</ul>`;
  } catch (e) { div.innerHTML = "<p>Error cargando inventario.</p>"; }
}

async function guardarNuevaPrenda() {
  const nombre = document.getElementById("nuevo-nombre").value.trim();
  const precio = Number(document.getElementById("nuevo-precio").value);
  const tallasInput = document.getElementById("nuevas-tallas").value.trim();
  if (!nombre || !precio) return notificar("⚠️ Llena el nombre y precio", "advertencia");
  let tallasArray = [];
  if (tallasInput) tallasArray = tallasInput.split(',').map(t => ({ talla: t.trim(), stockTalla: 0, precio: precio }));

  try {
    await db.collection("inventario").add({ nombre, precio, stock: 0, tallas: tallasArray });
    document.getElementById("nuevo-nombre").value = "";
    document.getElementById("nuevo-precio").value = "";
    document.getElementById("nuevas-tallas").value = "";
    notificar("✅ Prenda creada con éxito");
    cargarInventarioSPA(); cargarPrendas();
  } catch (error) { notificar("❌ Error guardando prenda", "error"); }
}

async function eliminarPrendaAdmin(id) {
  if(!confirm("¿Seguro que deseas eliminar esta prenda por completo?")) return;
  try {
    await db.collection("inventario").doc(id).delete();
    notificar("🗑️ Prenda eliminada");
    cargarInventarioSPA(); cargarPrendas();
  } catch (error) { notificar("❌ Error eliminando", "error"); }
}

// ==========================================
// 4A. MODAL PARA EDITAR NOMBRE Y PRECIO
// ==========================================
let prendaEditandoInfoId = null;

function abrirEdicionInfo(id) {
  const prenda = prendas.find(p => p.id === id);
  if(!prenda) return;
  
  prendaEditandoInfoId = id;
  document.getElementById("edit-nombre").value = prenda.nombre;
  document.getElementById("edit-precio").value = prenda.precio;
  
  document.getElementById("modal-editar").classList.add("modal-activo");
}

function cerrarModalEditar() {
  document.getElementById("modal-editar").classList.remove("modal-activo");
  prendaEditandoInfoId = null;
}

async function guardarEdicionInfo() {
  const nuevoNombre = document.getElementById("edit-nombre").value.trim();
  const nuevoPrecio = Number(document.getElementById("edit-precio").value);

  if(!nuevoNombre || !nuevoPrecio) return notificar("⚠️ Llena ambos campos", "advertencia");

  try {
    await db.collection("inventario").doc(prendaEditandoInfoId).update({
      nombre: nuevoNombre,
      precio: nuevoPrecio
    });
    notificar("✅ Información actualizada", "exito");
    cerrarModalEditar();
    cargarInventarioSPA();
    cargarPrendas();
  } catch(error) {
    notificar("❌ Error al actualizar", "error");
  }
}

// ==========================================
// 4B. MODAL TECLADO TÁCTIL (AGREGAR STOCK)
// ==========================================
let prendaEditandoId = null;
let tallaEditando = null;
let cantidadTeclado = "0";

function abrirEdicionStock(id) {
  prendaEditandoId = id;
  const prenda = prendas.find(p => p.id === id);
  if (!prenda) return;
  
  document.getElementById("modal-stock-titulo").innerText = `${prenda.nombre}`;
  document.getElementById("modal-paso-tallas").style.display = "block";
  document.getElementById("modal-paso-teclado").style.display = "none";
  
  const contenedorTallas = document.getElementById("modal-tallas-botones");
  contenedorTallas.innerHTML = "";
  
  if(prenda.tallas && prenda.tallas.length > 0) {
      prenda.tallas.forEach(t => {
        const btn = document.createElement("button");
        btn.innerText = `T${t.talla}`;
        btn.onclick = () => seleccionarTallaTeclado(t.talla);
        contenedorTallas.appendChild(btn);
      });
  } else {
      contenedorTallas.innerHTML = "<p>No hay tallas.</p>";
  }
  
  document.getElementById("modal-stock").classList.add("modal-activo");
}

function seleccionarTallaTeclado(talla) {
  tallaEditando = talla;
  cantidadTeclado = "0";
  document.getElementById("pantalla-cantidad").innerText = cantidadTeclado;
  document.getElementById("talla-seleccionada-txt").innerText = `${talla}`;
  document.getElementById("modal-paso-tallas").style.display = "none";
  document.getElementById("modal-paso-teclado").style.display = "block";
}

function teclear(valor) {
  if (valor === 'C') {
    cantidadTeclado = "0";
  } else {
    if (cantidadTeclado === "0") cantidadTeclado = String(valor);
    else cantidadTeclado += String(valor);
  }
  if(cantidadTeclado.length > 4) cantidadTeclado = cantidadTeclado.slice(0, 4);
  document.getElementById("pantalla-cantidad").innerText = cantidadTeclado;
}

function cerrarModalStock() {
  document.getElementById("modal-stock").classList.remove("modal-activo");
  prendaEditandoId = null;
  tallaEditando = null;
}

async function confirmarStockTeclado() {
  const cantidad = parseInt(cantidadTeclado);
  if (isNaN(cantidad) || cantidad <= 0) return notificar("⚠️ Ingresa una cantidad mayor a 0", "advertencia");
  
  const btnConfirmar = document.getElementById("btn-confirmar-teclado");
  btnConfirmar.innerText = "⏳"; btnConfirmar.disabled = true;

  try {
    await ajustarStock(prendaEditandoId, tallaEditando, cantidad);
    notificar(`✅ ${cantidad} agregados a la T${tallaEditando}`);
    cerrarModalStock();
    cargarInventarioSPA(); 
    cargarPrendas();       
  } catch (error) {
    notificar("❌ Error: " + error.message, "error");
  } finally {
    btnConfirmar.innerText = "✔"; btnConfirmar.disabled = false;
  }
}

// ==========================================
// 5. MAGIA PWA (BOTÓN INSTALAR APP)
// ==========================================
let eventoInstalacion;

window.addEventListener('beforeinstallprompt', (e) => {
  // Evitar que Chrome muestre el cartelito de forma automática y fea
  e.preventDefault();
  // Guardamos el evento para usarlo cuando el usuario toque nuestro botón
  eventoInstalacion = e;
  
  // Como sabemos que sí se puede instalar, hacemos aparecer el botón azul
  const btnInstalar = document.getElementById("btn-instalar");
  if(btnInstalar) btnInstalar.style.display = "inline-block";
});

async function instalarApp() {
  if (!eventoInstalacion) return;
  // Mostrar la ventana oficial de Google/Apple para instalar
  eventoInstalacion.prompt();
  
  // Esperar a ver si el usuario dijo que sí o que no
  const { outcome } = await eventoInstalacion.userChoice;
  if (outcome === 'accepted') {
    notificar("✅ ¡App instalada con éxito!");
    // Ocultar el botón porque ya está instalada
    document.getElementById("btn-instalar").style.display = "none";
  }
  // Limpiar el evento
  eventoInstalacion = null;
}

// INICIO AUTOMÁTICO
window.onload = async () => {
  if(window.location.href.includes("login.html")) return;
  cargarCarrito();
  await cargarPrendas();
  actualizarInterfaz();
};
