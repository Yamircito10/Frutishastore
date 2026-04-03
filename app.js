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

  doc.setFillColor(216, 27, 96); 
  doc.rect(0, 0, 210, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("LUDAVA", 14, 17);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("TikTok: @ludava36", 100, 17);

  doc.setTextColor(45, 52, 54);
  doc.setFontSize(10);
  doc.text("Recibo de Compra Digital", 14, 35);
  doc.text(`Fecha: ${fechaActual}`, 14, 42);
  doc.text(`Hora: ${horaActual}`, 14, 49);
  doc.setFont("helvetica", "bold");
  doc.text(`Pago vía: ${metodoPago}`, 14, 56); 

  // =========================================================================
  // 📷 ESPACIO PARA TU CÓDIGO QR
  // Pega tu texto gigante Base64 entre las comillas en lugar de "PEGAR_AQUI..."
  // =========================================================================
  let miCodigoQR = "data:image/jpeg;base64,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";
  doc.addImage(miCodigoQR, 'JPEG', 100, 25, 30, 30); 
  // Si tu imagen es JPG y te da error, cambia 'PNG' por 'JPEG' en la línea de arriba.

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

  let finalY = doc.lastAutoTable.finalY || 62;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(216, 27, 96); 
  doc.text(`Total Pagado: ${formatearSoles(totalVenta)}`, 14, finalY + 15);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("¡Gracias por tu compra! Etiquétanos en tu video de", 14, finalY + 28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(216, 27, 96); 
  doc.text("TikTok @ludava36", 14, finalY + 34);

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
