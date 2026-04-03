// ==========================================
//  LUDAVA STORE - CEREBRO SPA (app.js)
// ==========================================

let total = 0;
let productosSeleccionados = [];
let prendas = [];

const formatearSoles = (valor) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

function notificar(mensaje, tipo = "exito") {
  let colorFondo = tipo === "exito" ? "#2ecc71" : tipo === "error" ? "#e74c3c" : "#f39c12";
  Toastify({ text: mensaje, duration: 2500, gravity: "bottom", position: "center", style: { background: colorFondo, borderRadius: "10px", fontWeight: "bold", fontSize: "15px", boxShadow: "0 4px 6px rgba(0,0,0,0.2)" } }).showToast();
}

function recalcularTotal() {
  total = productosSeleccionados.reduce((suma, prod) => suma + Number(prod.precio), 0);
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
    
    // FOTO DEL PRODUCTO
    const img = document.createElement("img");
    img.className = "img-producto";
    img.src = prenda.imagen || "https://via.placeholder.com/150x140?text=Sin+Foto"; 
    img.alt = prenda.nombre;
    div.appendChild(img);

    const titulo = document.createElement("h3");
    titulo.innerText = `${prenda.nombre} (Total: ${prenda.stock ?? 0})`;
    div.appendChild(titulo);
    
    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";

    const tallas = Array.isArray(prenda.tallas) ? prenda.tallas : [];
    tallas.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "boton-talla";
      
      const stock = t.stockTalla ?? 0;
      btn.innerText = `T${t.talla}`; 
      
      // MAGIA DE STOCK BAJO
      if (stock > 0 && stock <= 3) {
        btn.classList.add("stock-bajo");
      }
      
      btn.disabled = stock <= 0;
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
  
  [0, 1, 2].forEach(desc => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = desc === 0 ? `Normal: S/${precioBase}` : `-S/${desc}`;
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
    recalcularTotal();
    
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
    
    productosSeleccionados.splice(index, 1);
    recalcularTotal();
    
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
    if (data) { 
      const parsed = JSON.parse(data); 
      productosSeleccionados = parsed.productos || []; 
      recalcularTotal(); 
    }
  } catch (e) { productosSeleccionados = []; total = 0; }
}

function reiniciarCarrito() {
  if (productosSeleccionados.length === 0) return notificar("El carrito ya está vacío", "advertencia");
  if (!confirm("¿Vaciar carrito? No se devolverá el stock automáticamente.")) return;
  
  productosSeleccionados = []; 
  recalcularTotal(); 
  
  localStorage.removeItem("carrito"); 
  actualizarInterfaz(); 
  notificar("🔄 Carrito vaciado", "exito");
}

// ==========================================
// 🎨 GENERAR RECIBO PDF (LUDAVA + TIKTOK)
// ==========================================
function generarPDFRecibo(productos, totalVenta, metodoPago) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: 'a5' }); 
  
  const fechaActual = new Date().toLocaleDateString("es-PE");
  const horaActual = new Date().toLocaleTimeString("es-PE");

  // Cabecera
  doc.setFillColor(216, 27, 96); 
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("LUDAVA", 14, 17);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("TikTok: @ludava36", 100, 17);

  // Datos del recibo
  doc.setTextColor(45, 52, 54);
  doc.setFontSize(10);
  doc.text("Recibo de Compra Digital", 14, 35);
  doc.text(`Fecha: ${fechaActual}`, 14, 42);
  doc.text(`Hora: ${horaActual}`, 14, 49);
  doc.setFont("helvetica", "bold");
  doc.text(`Pago vía: ${metodoPago}`, 14, 56); 

  // Tabla
  const datosTabla = productos.map(p => [
    `${p.nombre} (Talla: ${p.talla})`, 
    formatearSoles(p.precio)
  ]);

  doc.autoTable({
    startY: 62,
    head: [['Descripción de la Prenda', 'Importe']],
    body: datosTabla,
    theme: 'grid',
    headStyles: { fillColor: [253, 121, 168], textColor: [255,255,255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 1: { halign: 'right' } }
  });

  // Totales
  let finalY = doc.lastAutoTable.finalY || 62;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(216, 27, 96); 
  doc.text(`Total Pagado: ${formatearSoles(totalVenta)}`, 14, finalY + 15);
  
  // Despedida Centrada
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("¡Gracias por tu compra! Etiquétanos en tu video de", 74, finalY + 28, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(216, 27, 96); 
  doc.text("TikTok @ludava36", 74, finalY + 34, { align: "center" });

  // =========================================================================
  // 📷 CÓDIGO QR 
  // =========================================================================
  let miCodigoQR = "data:image/jpeg;base64,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";
  
  // x: 59 es el centro exacto de la hoja A5. finalY + 40 lo pone debajo del texto
  doc.addImage(miCodigoQR, 'JPEG', 59, finalY + 40, 30, 30); 

  doc.save(`Recibo_Ludava_${fechaActual.replace(/\//g, '-')}.pdf`);
}

// ==========================================
// 🚀 FINALIZAR VENTA (MODAL WA)
// ==========================================
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return notificar("⚠️ Agrega productos", "advertencia");
  const btn = document.querySelector(".btn-finalizar");
  const metodoPagoSelect = document.getElementById("metodo-pago");
  const metodoPago = metodoPagoSelect ? metodoPagoSelect.value : "Efectivo"; 
  
  btn.innerText = "⏳ Procesando..."; btn.disabled = true;
  
  try {
    await db.collection("ventas").add({
      fechaServidor: firebase.firestore.FieldValue.serverTimestamp(),
      fechaTexto: new Date().toLocaleDateString("es-PE"),
      hora: new Date().toLocaleTimeString("es-PE"),
      productos: productosSeleccionados,
      total: Number(total),
      metodoPago: metodoPago 
    });

    generarPDFRecibo(productosSeleccionados, total, metodoPago);
    notificar("📄 Descargando PDF del recibo...", "exito");

    if(document.getElementById("wa-numero")) document.getElementById("wa-numero").value = ""; 
    document.getElementById("modal-whatsapp").classList.add("modal-activo");

    productosSeleccionados = []; 
    recalcularTotal(); 
    guardarCarrito(); 
    actualizarInterfaz();
  } catch (err) { 
    notificar("❌ Error guardando la venta", "error"); 
  } finally { 
    btn.innerText = "💰 FINALIZAR VENTA"; btn.disabled = false; 
  }
}

function cerrarModalWhatsApp() {
  document.getElementById("modal-whatsapp").classList.remove("modal-activo");
}

function enviarWhatsApp() {
  let numeroCliente = document.getElementById("wa-numero").value.trim();
  let textoWa = `¡Hola! 🛍️✨ Gracias por tu compra en *LUDAVA*.\n\nAquí te adjunto el detalle de tu compra en PDF. ¡Que lo disfrutes! Síguenos en TikTok @ludava36`;
  
  if (numeroCliente !== "") {
    numeroCliente = numeroCliente.replace(/\D/g, '');
    if (numeroCliente.length === 9) numeroCliente = "51" + numeroCliente;
    window.open(`https://wa.me/${numeroCliente}?text=${encodeURIComponent(textoWa)}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(textoWa)}`, '_blank');
  }
  cerrarModalWhatsApp();
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

// ==========================================
// 📊 HISTORIAL Y REPORTES ACTUALIZADOS
// ==========================================
async function cargarHistorialSPA() {
  const ul = document.getElementById("ventasDia");
  ul.innerHTML = "<li style='text-align:center;'>⏳ Buscando ventas...</li>";
  try {
    const snap = await db.collection("ventas").orderBy("fechaServidor", "desc").limit(30).get();
    if(snap.empty) return ul.innerHTML = "<li style='text-align:center;'>No hay ventas aún.</li>";
    ul.innerHTML = snap.docs.map(doc => {
      const v = doc.data();
      const metodo = v.metodoPago || "Efectivo"; 
      let iconoPago = metodo === "Efectivo" ? "💵" : (metodo === "Tarjeta" ? "💳" : "📱");
      
      return `<li>
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">📅 ${v.fechaTexto} - 🕒 ${v.hora} | ${iconoPago} ${metodo}</div>
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
    let totalHistorico = 0; 
    let ventasPorDia = {};
    let resumenPagos = { "Efectivo": 0, "Yape/Plin": 0, "Tarjeta": 0 }; 

    snap.forEach(doc => {
      let v = doc.data(); 
      totalHistorico += v.total;
      
      let fecha = v.fechaTexto || "Sin fecha";
      ventasPorDia[fecha] = (ventasPorDia[fecha] || 0) + v.total;
      
      let metodo = v.metodoPago || "Efectivo";
      if(resumenPagos[metodo] !== undefined) {
         resumenPagos[metodo] += v.total;
      }
    });

    let html = `<div style="background: #27ae60; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                  <h3 style="margin:0;">Ventas Históricas</h3><h1 style="margin:5px 0 0 0; font-size: 2.5rem;">${formatearSoles(totalHistorico)}</h1>
                </div>`;
                
    html += `<h3>🏦 Cuadre de Caja (Total)</h3>
             <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; text-align: center;">
                <div style="background: white; padding: 15px; border-radius: 10px; border-top: 4px solid #f1c40f; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size: 20px; margin-bottom: 5px;">💵</div>
                    <div style="font-size: 11px; font-weight: bold; color: #888;">EFECTIVO</div>
                    <div style="font-size: 14px; font-weight: bold; color: #2ecc71;">${formatearSoles(resumenPagos["Efectivo"])}</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; border-top: 4px solid #9b59b6; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size: 20px; margin-bottom: 5px;">📱</div>
                    <div style="font-size: 11px; font-weight: bold; color: #888;">YAPE/PLIN</div>
                    <div style="font-size: 14px; font-weight: bold; color: #2ecc71;">${formatearSoles(resumenPagos["Yape/Plin"])}</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; border-top: 4px solid #3498db; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size: 20px; margin-bottom: 5px;">💳</div>
                    <div style="font-size: 11px; font-weight: bold; color: #888;">TARJETA</div>
                    <div style="font-size: 14px; font-weight: bold; color: #2ecc71;">${formatearSoles(resumenPagos["Tarjeta"])}</div>
                </div>
             </div>`;

    html += `<h3>💰 Resumen por Día</h3><ul style="list-style:none; padding:0;">`;
    for (let fecha in ventasPorDia) {
      html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; display: flex; justify-content: space-between; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
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
  const imagen = document.getElementById("nueva-imagen") ? document.getElementById("nueva-imagen").value.trim() : "";
  
  if (!nombre || !precio) return notificar("⚠️ Llena el nombre y precio", "advertencia");
  let tallasArray = [];
  if (tallasInput) tallasArray = tallasInput.split(',').map(t => ({ talla: t.trim(), stockTalla: 0, precio: precio }));

  try {
    await db.collection("inventario").add({ nombre, precio, stock: 0, tallas: tallasArray, imagen: imagen });
    document.getElementById("nuevo-nombre").value = "";
    document.getElementById("nuevo-precio").value = "";
    document.getElementById("nuevas-tallas").value = "";
    if(document.getElementById("nueva-imagen")) document.getElementById("nueva-imagen").value = "";
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
  if(document.getElementById("edit-imagen")) {
      document.getElementById("edit-imagen").value = prenda.imagen || "";
  }
  document.getElementById("modal-editar").classList.add("modal-activo");
}

function cerrarModalEditar() {
  document.getElementById("modal-editar").classList.remove("modal-activo");
  prendaEditandoInfoId = null;
}

async function guardarEdicionInfo() {
  const nuevoNombre = document.getElementById("edit-nombre").value.trim();
  const nuevoPrecio = Number(document.getElementById("edit-precio").value);
  const nuevaImagen = document.getElementById("edit-imagen") ? document.getElementById("edit-imagen").value.trim() : "";

  if(!nuevoNombre || !nuevoPrecio) return notificar("⚠️ Llena ambos campos", "advertencia");

  const prenda = prendas.find(p => p.id === prendaEditandoInfoId);
  let tallasActualizadas = [];
  if (prenda && prenda.tallas) {
     tallasActualizadas = prenda.tallas.map(t => ({...t, precio: nuevoPrecio}));
  }

  try {
    await db.collection("inventario").doc(prendaEditandoInfoId).update({
      nombre: nuevoNombre,
      precio: nuevoPrecio,
      tallas: tallasActualizadas,
      imagen: nuevaImagen
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
  e.preventDefault();
  eventoInstalacion = e;
  const btnInstalar = document.getElementById("btn-instalar");
  if(btnInstalar) btnInstalar.style.display = "inline-block";
});

async function instalarApp() {
  if (!eventoInstalacion) return;
  eventoInstalacion.prompt();
  const { outcome } = await eventoInstalacion.userChoice;
  if (outcome === 'accepted') {
    notificar("✅ ¡App instalada con éxito!");
    document.getElementById("btn-instalar").style.display = "none";
  }
  eventoInstalacion = null;
}

// INICIO AUTOMÁTICO
window.onload = async () => {
  if(window.location.href.includes("login.html")) return;
  cargarCarrito();
  await cargarPrendas();
  actualizarInterfaz();
};

// ==========================================
// 📥 EXPORTAR Y REINICIAR
// ==========================================
async function reiniciarTodoElHistorial() {
  if(!confirm("⚠️ ¡ADVERTENCIA MÁXIMA! ⚠️\n\nEstás a punto de BORRAR TODAS LAS VENTAS de la base de datos.\n\nEsto dejará la caja en S/ 0.00 y vaciará el historial y las tallas.\n\n¿Estás 100% seguro de que deseas continuar?")) return;
  
  let btn = event.target;
  let textoOriginal = btn.innerText;
  btn.innerText = "⏳ Borrando..."; btn.disabled = true;

  try {
    const snapshot = await db.collection("ventas").get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => { batch.delete(doc.ref); });
    await batch.commit();

    notificar("✅ ¡Base de datos reiniciada con éxito!", "exito");
    
    cargarHistorialSPA();
    cargarReporteVentasSPA();
    cargarReporteTallasSPA();
  } catch (error) {
    notificar("❌ Error al reiniciar", "error");
  } finally {
    btn.innerText = textoOriginal; btn.disabled = false;
  }
}

async function descargarReporteExcel() {
  notificar("⏳ Generando Excel...", "advertencia");
  try {
    const snapshot = await db.collection("ventas").orderBy("fechaServidor", "desc").get();
    if(snapshot.empty) return notificar("⚠️ No hay ventas para exportar");

    let datosExcel = [];
    snapshot.forEach(doc => {
      let v = doc.data();
      let descProductos = v.productos.map(p => `${p.nombre} (T${p.talla})`).join(" | ");
      datosExcel.push({
        "Fecha": v.fechaTexto || "-",
        "Hora": v.hora || "-",
        "Método de Pago": v.metodoPago || "Efectivo",
        "Productos Vendidos": descProductos,
        "Total (S/)": v.total
      });
    });

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Ventas LUDAVA");
    
    let fechaHoy = new Date().toLocaleDateString("es-PE").replace(/\//g, '-');
    XLSX.writeFile(libro, `Reporte_Ludava_${fechaHoy}.xlsx`);
    notificar("✅ Excel descargado", "exito");
  } catch (error) { notificar("❌ Error generando Excel", "error"); }
}

async function descargarReportePDF() {
  notificar("⏳ Generando PDF...", "advertencia");
  try {
    const snapshot = await db.collection("ventas").orderBy("fechaServidor", "desc").get();
    if(snapshot.empty) return notificar("⚠️ No hay ventas para exportar");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: 'a4' });
    
    doc.setFillColor(216, 27, 96); 
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("LUDAVA - Reporte de Ventas", 14, 17);

    let datosTabla = [];
    let totalGeneral = 0;
    let pagos = { "Efectivo": 0, "Yape/Plin": 0, "Tarjeta": 0 };

    snapshot.forEach(doc => {
      let v = doc.data();
      totalGeneral += v.total;
      let metodo = v.metodoPago || "Efectivo";
      if(pagos[metodo] !== undefined) pagos[metodo] += v.total;

      let descProductos = v.productos.map(p => `${p.nombre} (T${p.talla})`).join("\n");
      datosTabla.push([ v.fechaTexto, v.hora, metodo, descProductos, `S/ ${v.total.toFixed(2)}` ]);
    });

    doc.autoTable({
      startY: 35,
      head: [['Fecha', 'Hora', 'Pago', 'Productos', 'Total']],
      body: datosTabla,
      theme: 'grid',
      headStyles: { fillColor: [253, 121, 168] },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setTextColor(45, 52, 54);
    doc.setFontSize(12);
    doc.text(`Resumen de Caja:`, 14, finalY);
    doc.setFontSize(10);
    doc.text(`💵 Efectivo: S/ ${pagos["Efectivo"].toFixed(2)}`, 14, finalY + 7);
    doc.text(`📱 Yape/Plin: S/ ${pagos["Yape/Plin"].toFixed(2)}`, 14, finalY + 14);
    doc.text(`💳 Tarjeta: S/ ${pagos["Tarjeta"].toFixed(2)}`, 14, finalY + 21);
    
    doc.setFontSize(14);
    doc.setTextColor(216, 27, 96); 
    doc.text(`Total Generado: S/ ${totalGeneral.toFixed(2)}`, 130, finalY + 21);

    let fechaHoy = new Date().toLocaleDateString("es-PE").replace(/\//g, '-');
    doc.save(`Reporte_Ludava_${fechaHoy}.pdf`);
    notificar("✅ PDF descargado", "exito");
  } catch (error) { notificar("❌ Error generando PDF", "error"); }
}
