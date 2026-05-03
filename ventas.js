// ==========================================
// LUDAVA STORE - VENTAS, REPORTES Y GASTOS (ventas.js)
// ==========================================

// Variables globales para destruir gráficos viejos al recargar
let chartVentasDia = null;
let chartMetodosPago = null;

// 📄 GENERADOR DE CATÁLOGO PDF
async function descargarCatalogoPDF() {
  if (prendas.length === 0) return notificar("⚠️ No hay prendas en el catálogo", "advertencia");
  notificar("⏳ Generando Catálogo...", "exito");
  
  const btn = document.getElementById("btn-bajar-catalogo");
  let textoOriginal = btn.innerText;
  btn.innerText = "⏳..."; 
  btn.disabled = true;

  try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const fechaActual = new Date().toLocaleDateString("es-PE");
      const tituloTienda = configActual.titulo || "LUDAVA"; 
      
      doc.setFillColor(216, 27, 96); 
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(`CATÁLOGO OFICIAL - ${tituloTienda}`, 105, 20, { align: "center" });

      doc.setTextColor(45, 52, 54);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Actualizado al: ${fechaActual}`, 105, 38, { align: "center" });
      doc.text("📱 Pedidos por WhatsApp: 977 757 369", 105, 45, { align: "center" });

      let datosTabla = [];
      prendas.forEach(p => {
          let tallasTexto = Array.isArray(p.tallas) && p.tallas.length > 0
              ? p.tallas.map(t => `T${t.talla}`).join(', ')
              : "Única";
          datosTabla.push([ p.nombre, p.categoria || 'Unisex', tallasTexto, formatearSoles(p.precio) ]);
      });

      doc.autoTable({
          startY: 55,
          head: [['Prenda', 'Categoría', 'Tallas Disponibles', 'Precio Base']],
          body: datosTabla,
          theme: 'grid',
          headStyles: { fillColor: [93, 173, 226], textColor: [255,255,255], fontStyle: 'bold', halign: 'center' },
          bodyStyles: { fontSize: 11, valign: 'middle' },
          columnStyles: {
              0: { cellWidth: 70 },
              1: { cellWidth: 35, halign: 'center' },
              2: { cellWidth: 50, halign: 'center' },
              3: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [216, 27, 96] }
          }
      });

      doc.save(`Catalogo_${tituloTienda}_${fechaActual.replace(/\//g, '-')}.pdf`);
      notificar("✅ Catálogo descargado", "exito");
  } catch (error) {
      console.error(error);
      notificar("❌ Error al generar el PDF", "error");
  } finally {
      btn.innerText = textoOriginal;
      btn.disabled = false;
  }
}

// 🎨 GENERAR RECIBO PDF
function generarPDFRecibo(productos, totalVenta, metodoPago, fechaSale, horaSale) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: 'a5' }); 
  const fechaActual = fechaSale || new Date().toLocaleDateString("es-PE");
  const horaActual = horaSale || new Date().toLocaleTimeString("es-PE");
  const tituloTienda = configActual.titulo || "LUDAVA";

  doc.setFillColor(93, 173, 226); doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text(tituloTienda, 14, 17);
  doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text("TikTok: @ludava36", 100, 17);
  doc.setTextColor(45, 52, 54); doc.setFontSize(10); doc.text("Recibo de Compra Digital", 14, 35);
  doc.text(`Fecha: ${fechaActual}`, 14, 42); doc.text(`Hora: ${horaActual}`, 14, 49);
  doc.setFont("helvetica", "bold"); doc.text(`Pago vía: ${metodoPago}`, 14, 56); 

  const datosTabla = productos.map(p => [`${p.nombre} (Talla: ${p.talla})`, formatearSoles(p.precio)]);

  doc.autoTable({ startY: 62, head: [['Descripción de la Prenda', 'Importe']], body: datosTabla, theme: 'grid', headStyles: { fillColor: [253, 121, 168], textColor: [255,255,255], fontStyle: 'bold' }, styles: { fontSize: 10, cellPadding: 5 }, columnStyles: { 1: { halign: 'right' } } });

  let finalY = doc.lastAutoTable.finalY || 62;
  doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(216, 27, 96); doc.text(`Total Pagado: ${formatearSoles(totalVenta)}`, 14, finalY + 15);
  doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100); doc.text("¡Gracias por tu compra! Etiquétanos en tu video de", 74, finalY + 28, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setTextColor(93, 173, 226); doc.text("TikTok @ludava36", 74, finalY + 34, { align: "center" });

  let miCodigoQR = "data:image/jpeg;base64,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"; 
  try { doc.addImage(miCodigoQR, 'JPEG', 59, finalY + 38, 30, 30); } catch (error) {}

  let contactoY = finalY + 74; 
  doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100); doc.text("Para cualquier información o pedidos, escríbenos a:", 74, contactoY, { align: "center" });
  doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(216, 27, 96); doc.text("977 757 369", 42, contactoY + 7, { align: "center" });
  doc.setFontSize(11); doc.setTextColor(150, 150, 150); doc.text("y al", 74, contactoY + 7, { align: "center" });
  doc.setFontSize(14); doc.setTextColor(93, 173, 226); doc.text("903 053 700", 106, contactoY + 7, { align: "center" });

  doc.save(`Recibo_${tituloTienda}_${fechaActual.replace(/\//g, '-')}.pdf`);
}

// 🚀 FINALIZAR VENTA (CLIENTE VS ADMIN)
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return notificar("⚠️ Agrega productos", "advertencia");
  const btn = document.querySelector(".btn-finalizar");
  const metodoPagoSelect = document.getElementById("metodo-pago");
  const metodoPago = metodoPagoSelect ? metodoPagoSelect.value : "Pedido Web"; 
  const rol = localStorage.getItem("rolActivo"); 
  const tituloTienda = configActual.titulo || "LUDAVA";
  
  btn.innerText = "⏳ Procesando..."; btn.disabled = true;
  try {
    await db.collection("ventas").add({ fechaServidor: firebase.firestore.FieldValue.serverTimestamp(), fechaTexto: new Date().toLocaleDateString("es-PE"), hora: new Date().toLocaleTimeString("es-PE"), productos: productosSeleccionados, total: Number(total), metodoPago: metodoPago, origen: rol === "admin" ? "Local" : "Página Web" });
    generarPDFRecibo(productosSeleccionados, total, metodoPago);
    notificar("📄 Generando recibo...", "exito");

    if (rol === "admin") {
        if(document.getElementById("wa-numero")) document.getElementById("wa-numero").value = ""; 
        if(document.getElementById("wa-nombre")) document.getElementById("wa-nombre").value = ""; 
        document.getElementById("modal-whatsapp").classList.add("modal-activo");
    } else {
        let textoWa = `¡Hola ${tituloTienda}! 🛍️✨ Acabo de hacer un pedido en la tienda virtual por el monto de S/ ${total}. Mi recibo se acaba de descargar. ¡Deseo coordinar el pago y envío!`;
        window.open(`https://wa.me/51977757369?text=${encodeURIComponent(textoWa)}`, '_blank');
        productosSeleccionados = []; recalcularTotal(); guardarCarrito(); actualizarInterfaz();
    }
  } catch (err) { notificar("❌ Error al procesar", "error"); 
  } finally { btn.innerText = "Enviar Pedido 🚀"; btn.disabled = false; }
}

function cerrarModalWhatsApp() { document.getElementById("modal-whatsapp").classList.remove("modal-activo"); }
async function enviarWhatsApp() {
  let numeroCliente = document.getElementById("wa-numero").value.trim();
  let nombreCliente = document.getElementById("wa-nombre").value.trim();
  const tituloTienda = configActual.titulo || "LUDAVA";
  let textoWa = `¡Hola ${nombreCliente ? nombreCliente : ''}! 🛍️✨ Gracias por tu compra en *${tituloTienda}*.\n\nAquí te adjunto el detalle de tu compra en PDF. ¡Que lo disfrutes! Síguenos en TikTok @ludava36`;
  
  if(numeroCliente && nombreCliente) {
     try { await db.collection("clientes").doc(numeroCliente).set({ nombre: nombreCliente, celular: numeroCliente, ultimaCompra: new Date().toLocaleDateString("es-PE") }, { merge: true });
     } catch(e) {}
  }
  if (numeroCliente !== "") {
    numeroCliente = numeroCliente.replace(/\D/g, '');
    if (numeroCliente.length === 9) numeroCliente = "51" + numeroCliente;
    window.open(`https://wa.me/${numeroCliente}?text=${encodeURIComponent(textoWa)}`, '_blank');
  } else { window.open(`https://wa.me/?text=${encodeURIComponent(textoWa)}`, '_blank'); }
  cerrarModalWhatsApp(); productosSeleccionados = []; recalcularTotal(); guardarCarrito(); actualizarInterfaz();
}

// ==========================================
// 📊 REPORTES Y DASHBOARD VISUAL (NIVEL WALL STREET)
// ==========================================
async function cargarReporteVentasSPA() { 
  const div = document.getElementById("kpis-ventas");
  div.innerHTML = "<p style='text-align:center;'>⏳ Analizando finanzas...</p>";
  try {
    const snapVentas = await db.collection("ventas").orderBy("fechaServidor", "asc").get();
    const snapGastos = await db.collection("gastos").get();
    
    let totalVentas = 0; let totalGastos = 0; 
    let ventasPorDia = {}; 
    let resumenPagos = { "Efectivo": 0, "Yape/Plin": 0, "Tarjeta": 0, "Pedido Web": 0 }; 
    
    snapVentas.forEach(doc => {
      let v = doc.data(); 
      totalVentas += v.total; 
      let fecha = v.fechaTexto || "Sin fecha";
      ventasPorDia[fecha] = (ventasPorDia[fecha] || 0) + v.total;
      let metodo = v.metodoPago || "Efectivo"; 
      if(resumenPagos[metodo] !== undefined) resumenPagos[metodo] += v.total;
    });
    
    snapGastos.forEach(doc => { totalGastos += doc.data().monto; });
    
    let gananciaNeta = totalVentas - totalGastos; 
    let colorGanancia = gananciaNeta >= 0 ? "#27ae60" : "#e74c3c";
    
    // 1. Tarjetas de KPI principales
    let html = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; text-align: center;">
                  <div style="background: #3498db; color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><h4 style="margin:0; font-size:12px;">Ingresos</h4><h2 style="margin:5px 0 0 0;">${formatearSoles(totalVentas)}</h2></div>
                  <div style="background: #e74c3c; color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><h4 style="margin:0; font-size:12px;">Egresos</h4><h2 style="margin:5px 0 0 0;">${formatearSoles(totalGastos)}</h2></div>
                  <div style="background: ${colorGanancia}; color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><h4 style="margin:0; font-size:12px;">Ganancia</h4><h2 style="margin:5px 0 0 0;">${formatearSoles(gananciaNeta)}</h2></div>
                </div>`;
                
    // 2. Gráfico de Ventas por Día
    html += `<div style="background: var(--tarjetas); padding: 15px; border-radius: 15px; box-shadow: 0 6px 15px rgba(0,0,0,0.05); margin-bottom: 20px;">
               <h3 style="text-align:center; color: var(--principal); margin-top:0;">📊 Evolución de Ventas</h3>
               <canvas id="chartVentasDia" height="200"></canvas>
             </div>`;
             
    // 3. Gráfico de Métodos de Pago
    html += `<div style="background: var(--tarjetas); padding: 15px; border-radius: 15px; box-shadow: 0 6px 15px rgba(0,0,0,0.05); margin-bottom: 20px;">
               <h3 style="text-align:center; color: var(--principal); margin-top:0;">💳 ¿Cómo te pagan?</h3>
               <canvas id="chartMetodosPago" height="200"></canvas>
             </div>`;
             
    // 4. Lista detallada por día (como la tenías antes)
    html += `<h3>💰 Detalle por Día</h3><ul style="list-style:none; padding:0;">`;
    // Invertimos el orden para ver el día más reciente arriba en la lista
    let fechasInvertidas = Object.keys(ventasPorDia).reverse();
    for (let fecha of fechasInvertidas) {
        html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; display: flex; justify-content: space-between; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"><strong>📅 ${fecha}</strong> <span style="color:#d63384; font-weight:bold;">${formatearSoles(ventasPorDia[fecha])}</span></li>`;
    }
    html += `</ul>`;
    
    div.innerHTML = html;

    // 🚀 DIBUJAR LOS GRÁFICOS CON LA LIBRERÍA
    const ctxDia = document.getElementById('chartVentasDia');
    if (ctxDia) {
      if (chartVentasDia) chartVentasDia.destroy();
      chartVentasDia = new Chart(ctxDia, {
        type: 'line',
        data: {
          labels: Object.keys(ventasPorDia), // Eje X (Fechas)
          datasets: [{
            label: 'Ingresos (S/)',
            data: Object.values(ventasPorDia), // Eje Y (Montos)
            borderColor: '#ff7eb3',
            backgroundColor: 'rgba(255, 126, 179, 0.2)',
            borderWidth: 3,
            fill: true,
            tension: 0.4, // Curvas suaves
            pointBackgroundColor: '#fff',
            pointBorderColor: '#ff7eb3',
            pointRadius: 4
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    const ctxMetodo = document.getElementById('chartMetodosPago');
    if (ctxMetodo) {
      if (chartMetodosPago) chartMetodosPago.destroy();
      chartMetodosPago = new Chart(ctxMetodo, {
        type: 'doughnut',
        data: {
          labels: ['Efectivo', 'Yape/Plin', 'Tarjeta', 'Web'],
          datasets: [{
            data: [resumenPagos["Efectivo"], resumenPagos["Yape/Plin"], resumenPagos["Tarjeta"], resumenPagos["Pedido Web"]],
            backgroundColor: ['#f1c40f', '#9b59b6', '#3498db', '#2ecc71'],
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: { responsive: true, cutout: '70%' }
      });
    }

  } catch (e) { div.innerHTML = "<p>Error cargando el Dashboard de Ventas.</p>"; console.log(e); }
}

async function cargarHistorialSPA() {
  const ul = document.getElementById("ventasDia");
  ul.innerHTML = "<li style='text-align:center;'>⏳ Buscando ventas...</li>";
  try {
    const snap = await db.collection("ventas").orderBy("fechaServidor", "desc").limit(30).get();
    if(snap.empty) return ul.innerHTML = "<li style='text-align:center;'>No hay ventas aún.</li>";
    
    ventasHistorialCache = snap.docs.map(doc => doc.data()); 

    ul.innerHTML = ventasHistorialCache.map((v, index) => {
      const metodo = v.metodoPago || "Efectivo"; 
      let iconoPago = metodo === "Efectivo" ? "💵" : (metodo === "Tarjeta" ? "💳" : (metodo === "Pedido Web" ? "🌐" : "📱"));
      return `<li style="background: var(--tarjetas); padding: 15px; margin-bottom: 10px; border-radius: 10px; border-left: 5px solid var(--principal); box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: var(--texto);">
          <div style="font-size: 12px; color: #888; margin-bottom: 8px; display: flex; justify-content: space-between;">
             <span>📅 ${v.fechaTexto} - 🕒 ${v.hora}</span>
             <span>${iconoPago} ${metodo}</span>
          </div>
          <div style="font-weight: bold; margin-bottom: 8px;">${v.productos.map(p => p.texto || p.nombre).join(" | ")}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
             <button onclick="reimprimirRecibo(${index})" style="background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">📄 Bajar Recibo</button>
             <span style="color: #27ae60; font-weight: bold; font-size: 15px;">Total: ${formatearSoles(v.total)}</span>
          </div>
        </li>`;
    }).join('');
  } catch (e) { ul.innerHTML = "<li>Error cargando historial</li>"; }
}

window.reimprimirRecibo = function(index) {
   const v = ventasHistorialCache[index];
   if(!v) return notificar("⚠️ Error al buscar la venta", "error");
   generarPDFRecibo(v.productos, v.total, v.metodoPago, v.fechaTexto, v.hora);
   notificar("📄 Generando recibo nuevamente...", "exito");
}

async function cargarReporteTallasSPA() {
  const div = document.getElementById("kpis-tallas");
  try {
    const snap = await db.collection("ventas").get(); let conteoTallas = {};
    snap.forEach(doc => doc.data().productos.forEach(p => conteoTallas[p.talla || "Única"] = (conteoTallas[p.talla || "Única"] || 0) + 1));
    let html = `<ul style="list-style:none; padding:0;">`;
    for (let t in conteoTallas) html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; border-left: 5px solid #3498db; display: flex; justify-content: space-between; color: #333;"><strong>Talla ${t}</strong> <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 20px;">Vendidos: ${conteoTallas[t]}</span></li>`;
    div.innerHTML = Object.keys(conteoTallas).length > 0 ? html + `</ul>` : "<p>Aún no hay datos.</p>";
  } catch (e) { div.innerHTML = "<p>Error cargando tallas.</p>"; }
}

async function cargarClientesSPA() {
  const div = document.getElementById("lista-clientes"); if (!div) return;
  div.innerHTML = "<p style='text-align:center;'>⏳ Cargando agenda...</p>";
  try {
    const snap = await db.collection("clientes").get();
    if(snap.empty) return div.innerHTML = "<p style='text-align:center; color:#888;'>Aún no tienes clientes guardados.</p>";
    let html = `<ul style="list-style:none; padding:0;">`;
    snap.forEach(doc => { let c = doc.data(); html += `<li style="background: var(--tarjetas); padding:15px; margin-bottom:10px; border-radius:10px; border-left:5px solid #9b59b6; display:flex; justify-content:space-between; align-items:center; color: var(--texto);"><div><strong style="font-size: 16px;">👤 ${c.nombre}</strong><br><small style="color:#888;">Última compra: ${c.ultimaCompra}</small></div><a href="https://wa.me/51${c.celular}" target="_blank" style="background:#25D366; color:white; padding:8px 12px; border-radius:20px; text-decoration:none; font-weight:bold; font-size:12px;">📱 Escribir</a></li>`; });
    div.innerHTML = html + `</ul>`;
  } catch (e) { div.innerHTML = "<p>Error cargando clientes.</p>"; }
}

// ==========================================
// 💸 MÓDULO DE GASTOS Y PROVEEDORES 
// ==========================================
async function guardarGasto() {
  const motivo = document.getElementById("gasto-motivo").value.trim(); const monto = Number(document.getElementById("gasto-monto").value); const categoria = document.getElementById("gasto-categoria").value;
  if (!motivo || !monto) return notificar("⚠️ Completa motivo y monto", "advertencia");
  try { await db.collection("gastos").add({ motivo, monto, categoria, fechaServidor: firebase.firestore.FieldValue.serverTimestamp(), fechaTexto: new Date().toLocaleDateString("es-PE"), hora: new Date().toLocaleTimeString("es-PE") });
    document.getElementById("gasto-motivo").value = ""; document.getElementById("gasto-monto").value = ""; notificar("✅ Gasto registrado", "exito"); cargarGastosSPA();
  } catch (e) { notificar("❌ Error al guardar gasto", "error"); }
}

async function cargarGastosSPA() {
  const div = document.getElementById("lista-gastos"); if (!div) return;
  try {
    const snap = await db.collection("gastos").orderBy("fechaServidor", "desc").limit(30).get();
    if (snap.empty) return div.innerHTML = "<p style='text-align:center; color:#888;'>No hay gastos registrados aún.</p>";
    let html = `<h3 style="color: var(--principal); margin-top: 20px;">📉 Historial de Gastos</h3><ul style="list-style:none; padding:0;">`;
    snap.forEach(doc => { const g = doc.data(); html += `<li style="background: var(--tarjetas); padding:15px; margin-bottom:10px; border-radius:10px; border-left:5px solid #e74c3c; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: var(--texto);"><div><strong style="font-size: 15px;">${g.motivo}</strong><br><small style="color:#888;">📅 ${g.fechaTexto} - 🕒 ${g.hora} | 🏷️ ${g.categoria}</small></div><span style="font-weight:bold; color:#e74c3c; font-size: 16px;">- ${formatearSoles(g.monto)}</span></li>`; });
    div.innerHTML = html + "</ul>";
  } catch (e) {}
}

// ==========================================
// 🗑️ EXTRAS REPORTES
// ==========================================
async function reiniciarTodoElHistorial() { if(!confirm("⚠️ ADVERTENCIA: Borrarás todo el historial. ¿Seguro?")) return; let btn = event.target; let textoOriginal = btn.innerText; btn.innerText = "⏳ Borrando..."; btn.disabled = true; try { const snapshot = await db.collection("ventas").get(); const batch = db.batch(); snapshot.docs.forEach((doc) => { batch.delete(doc.ref); }); await batch.commit(); notificar("✅ Historial limpiado", "exito"); cargarHistorialSPA(); cargarReporteVentasSPA(); } catch (error) {} finally { btn.innerText = textoOriginal; btn.disabled = false; } }

async function descargarReporteExcel() { notificar("⏳ Generando Excel...", "advertencia"); try { const snapshot = await db.collection("ventas").orderBy("fechaServidor", "desc").get(); if(snapshot.empty) return notificar("⚠️ No hay ventas"); let datosExcel = []; snapshot.forEach(doc => { let v = doc.data(); let descProductos = v.productos.map(p => `${p.nombre} (T${p.talla})`).join(" | "); datosExcel.push({ "Fecha": v.fechaTexto || "-", "Hora": v.hora || "-", "Método": v.metodoPago || "Efectivo", "Productos": descProductos, "Total": v.total }); }); const hoja = XLSX.utils.json_to_sheet(datosExcel); const libro = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(libro, hoja, "Ventas"); XLSX.writeFile(libro, `Ludava_${new Date().toLocaleDateString("es-PE").replace(/\//g, '-')}.xlsx`); notificar("✅ Excel bajado", "exito"); } catch (error) {} }

async function descargarReportePDF() { notificar("⏳ Generando PDF...", "advertencia"); try { const snapshot = await db.collection("ventas").orderBy("fechaServidor", "desc").get(); if(snapshot.empty) return notificar("⚠️ No hay ventas"); const { jsPDF } = window.jspdf; const doc = new jsPDF({ format: 'a4' }); doc.setFillColor(216, 27, 96); doc.rect(0, 0, 210, 25, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text("LUDAVA - Reporte", 14, 17); let datosTabla = []; let totalGeneral = 0; snapshot.forEach(doc => { let v = doc.data(); totalGeneral += v.total; let desc = v.productos.map(p => `${p.nombre} (T${p.talla})`).join("\n"); datosTabla.push([ v.fechaTexto, v.metodoPago, desc, `S/ ${v.total.toFixed(2)}` ]); }); doc.autoTable({ startY: 35, head: [['Fecha', 'Pago', 'Productos', 'Total']], body: datosTabla, theme: 'grid' }); doc.setFontSize(14); doc.text(`Total: S/ ${totalGeneral.toFixed(2)}`, 130, doc.lastAutoTable.finalY + 10); doc.save(`Reporte_${new Date().toLocaleDateString("es-PE").replace(/\//g, '-')}.pdf`); notificar("✅ PDF bajado", "exito"); } catch (error) {} }
