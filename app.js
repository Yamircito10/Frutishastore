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
// 🎨 GENERAR RECIBO PDF (LUDAVA: CELESTE, ROSADO Y CONTACTO)
// ==========================================
function generarPDFRecibo(productos, totalVenta, metodoPago) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: 'a5' }); 
  
  const fechaActual = new Date().toLocaleDateString("es-PE");
  const horaActual = new Date().toLocaleTimeString("es-PE");

  // 🟦 CABECERA (CELESTE PASTEL NIÑOS)
  doc.setFillColor(93, 173, 226); 
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

  // 🎀 TABLA (ROSADO PASTEL NIÑAS)
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

  // 💖 TOTALES 
  let finalY = doc.lastAutoTable.finalY || 62;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(216, 27, 96); 
  doc.text(`Total Pagado: ${formatearSoles(totalVenta)}`, 14, finalY + 15);
  
  // 💙 DESPEDIDA CENTRADA
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100); 
  doc.text("¡Gracias por tu compra! Etiquétanos en tu video de", 74, finalY + 28, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(93, 173, 226); 
  doc.text("TikTok @ludava36", 74, finalY + 34, { align: "center" });

  // =========================================================================
  // 📷 CÓDIGO QR 
  // =========================================================================
  // Borra "PEGA_AQUI_TU_QR_GIGANTE" y pega tu código Base64 (dejando las comillas)
  let miCodigoQR = "PEGA_AQUI_TU_QR_GIGANTE";
  
  try {
    doc.addImage(miCodigoQR, 'JPEG', 59, finalY + 38, 30, 30); 
  } catch (error) {
    console.error("Error dibujando QR:", error);
  }

  // =========================================================================
  // 📞 NÚMEROS DE CONTACTO (ROSADO Y CELESTE)
  // =========================================================================
  let contactoY = finalY + 74; // Posición justo debajo del QR

  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100); 
  doc.text("Para cualquier información o pedidos, escríbenos a:", 74, contactoY, { align: "center" });

  // Números Resaltados y Grandes
  doc.setFontSize(14); 
  doc.setFont("helvetica", "bold");

  // Número Rosado (Izquierda)
  doc.setTextColor(216, 27, 96); 
  doc.text("977 757 369", 42, contactoY + 7, { align: "center" });

  // Separador (Centro)
  doc.setFontSize(11);
  doc.setTextColor(150, 150, 150); 
  doc.text("y al", 74, contactoY + 7, { align: "center" });

  // Número Celeste (Derecha)
  doc.setFontSize(14);
  doc.setTextColor(93, 173, 226); 
  doc.text("903 053 700", 106, contactoY + 7, { align: "center" });

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
