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
  } catch (error) {
    console.error(error);
    notificar("❌ Error cargando el inventario.", "error");
  }
}

function generarVistaPrendas() {
  const contenedor = document.getElementById("lista-prendas");
  if(!contenedor) return;
  contenedor.innerHTML = "";

  if (prendas.length === 0) {
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
    const idx = tallas.findIndex(x => Number(x.talla) === Number(tallaNumero));
    if (idx === -1) throw new Error("Talla no encontrada");
    const actual = Number(tallas[idx].stockTalla || 0) + delta;
    if (actual < 0) throw new Error("Sin stock");
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
    productosSeleccionados.push({ id: prenda.id, nombre: prenda.nombre, talla: Number(tallaSel.talla), precio: Number(precioFinal), texto: `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}` });
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
  if (!confirm("¿Vaciar carrito? No se devolverá el stock a Firebase automáticamente.")) return;
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
    total = 0; productosSeleccionados = []; guardarCarrito(); actualizarInterfaz();
    notificar("✅ ¡Venta registrada!", "exito");
  } catch (err) { notificar("❌ Error en venta", "error"); } 
  finally { btn.innerText = "💰 FINALIZAR VENTA"; btn.disabled = false; }
}


// ==========================================
// 2. MAGIA DE LA NAVEGACIÓN SPA Y CARGA DE DATOS
// ==========================================

// Re-escribimos la función navegar del index para que cargue los datos al instante
window.navegarSPA = function(idDestino) {
  // 1. Ocultar todas las pantallas y mostrar la elegida
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('pantalla-activa'));
  document.getElementById(idDestino).classList.add('pantalla-activa');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 2. Disparar la carga de datos según la pantalla
  if (idDestino === 'vista-historial') cargarHistorialSPA();
  if (idDestino === 'vista-ventas') cargarReporteVentasSPA();
  if (idDestino === 'vista-tallas') cargarReporteTallasSPA();
  if (idDestino === 'vista-inventario') cargarInventarioSPA();
};

// --- A. PANTALLA HISTORIAL ---
async function cargarHistorialSPA() {
  const ul = document.getElementById("ventasDia");
  ul.innerHTML = "<li style='text-align:center;'>⏳ Buscando ventas...</li>";
  try {
    const snap = await db.collection("ventas").orderBy("fechaServidor", "desc").limit(30).get();
    if(snap.empty) { ul.innerHTML = "<li style='text-align:center;'>No hay ventas aún.</li>"; return; }
    
    ul.innerHTML = snap.docs.map(doc => {
      const v = doc.data();
      const resumen = v.productos.map(p => p.texto || p.nombre).join(" | ");
      return `
        <li>
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">📅 ${v.fechaTexto} - 🕒 ${v.hora}</div>
          <div style="font-weight: bold;">${resumen}</div>
          <div style="color: #27ae60; font-weight: bold; text-align: right; margin-top: 5px;">Total: ${formatearSoles(v.total)}</div>
        </li>`;
    }).join('');
  } catch (e) { ul.innerHTML = "<li>Error cargando historial</li>"; }
}

// --- B. PANTALLA VENTAS ---
async function cargarReporteVentasSPA() {
  const div = document.getElementById("kpis-ventas");
  div.innerHTML = "<p>⏳ Calculando ingresos...</p>";
  try {
    const snap = await db.collection("ventas").get();
    let totalHistorico = 0;
    let ventasPorDia = {};
    
    snap.forEach(doc => {
      let v = doc.data();
      totalHistorico += v.total;
      let fecha = v.fechaTexto || "Sin fecha";
      ventasPorDia[fecha] = (ventasPorDia[fecha] || 0) + v.total;
    });

    let html = `<div style="background: #27ae60; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                  <h3 style="margin:0;">Ventas Históricas</h3>
                  <h1 style="margin:5px 0 0 0; font-size: 2.5rem;">${formatearSoles(totalHistorico)}</h1>
                </div>`;
    
    html += `<h3>💰 Resumen por Día</h3><ul style="list-style:none; padding:0;">`;
    for (let fecha in ventasPorDia) {
      html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; justify-content: space-between;">
                <strong>📅 ${fecha}</strong> 
                <span style="color:#d63384; font-weight:bold;">${formatearSoles(ventasPorDia[fecha])}</span>
               </li>`;
    }
    html += `</ul>`;
    div.innerHTML = html;
  } catch (e) { div.innerHTML = "<p>Error cargando ventas.</p>"; }
}

// --- C. PANTALLA TALLAS ---
async function cargarReporteTallasSPA() {
  const div = document.getElementById("kpis-tallas");
  div.innerHTML = "<p>⏳ Analizando tallas...</p>";
  try {
    const snap = await db.collection("ventas").get();
    let conteoTallas = {};
    
    snap.forEach(doc => {
      let prods = doc.data().productos || [];
      prods.forEach(p => {
        let talla = p.talla || "Única";
        conteoTallas[talla] = (conteoTallas[talla] || 0) + 1;
      });
    });

    let html = `<ul style="list-style:none; padding:0;">`;
    for (let t in conteoTallas) {
      html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; border-left: 5px solid #3498db; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; justify-content: space-between;">
                <strong>Talla ${t}</strong> 
                <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 20px;">Vendidos: ${conteoTallas[t]}</span>
               </li>`;
    }
    html += `</ul>`;
    div.innerHTML = Object.keys(conteoTallas).length > 0 ? html : "<p>Aún no hay datos de tallas.</p>";
  } catch (e) { div.innerHTML = "<p>Error cargando tallas.</p>"; }
}

// --- D. PANTALLA INVENTARIO ---
async function cargarInventarioSPA() {
  const div = document.getElementById("admin-inventario");
  if (prendas.length === 0) await cargarPrendas();
  
  let html = `<p style="font-size:14px; color:#666;">Vista rápida de tu almacén</p><ul style="list-style:none; padding:0;">`;
  prendas.forEach(p => {
    let stockColor = p.stock > 5 ? '#27ae60' : (p.stock > 0 ? '#f39c12' : '#e74c3c');
    html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; border-left: 5px solid ${stockColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; justify-content: space-between;">
              <strong>${p.nombre}</strong> 
              <span style="color: ${stockColor}; font-weight: bold;">Stock: ${p.stock || 0}</span>
             </li>`;
  });
  html += `</ul>`;
  div.innerHTML = html;
}

// ==========================================
// 3. INICIALIZAR SISTEMA
// ==========================================
window.onload = async () => {
  if(window.location.href.includes("login.html")) return;
  cargarCarrito();
  await cargarPrendas();
  actualizarInterfaz();
};
      
