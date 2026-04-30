// 📄 GENERADOR DE CATÁLOGO PDF
async function descargarCatalogoPDF() {
  if (prendas.length === 0) return notificar("⚠️ Catálogo vacío", "advertencia");
  const btn = document.getElementById("btn-bajar-catalogo");
  btn.innerText = "⏳..."; btn.disabled = true;
  try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const fecha = new Date().toLocaleDateString("es-PE");
      const titulo = configActual.titulo || "LUDAVA"; 
      doc.setFillColor(216, 27, 96); doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(22);
      doc.text(`CATÁLOGO OFICIAL - ${titulo}`, 105, 20, { align: "center" });
      let datos = prendas.map(p => [ p.nombre, p.categoria, p.tallas.map(t => `T${t.talla}`).join(','), formatearSoles(p.precio) ]);
      doc.autoTable({ startY: 45, head: [['Prenda', 'Categoría', 'Tallas', 'Precio Base']], body: datos });
      doc.save(`Catalogo_${titulo}.pdf`);
  } catch (e) { notificar("❌ Error PDF", "error"); } finally { btn.innerText = "📄 Catálogo"; btn.disabled = false; }
}

function generarPDFRecibo(productos, totalVenta, metodoPago, fechaSale, horaSale) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: 'a5' }); 
  const fecha = fechaSale || new Date().toLocaleDateString("es-PE");
  const hora = horaSale || new Date().toLocaleTimeString("es-PE");
  const titulo = configActual.titulo || "LUDAVA";

  doc.setFillColor(93, 173, 226); doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text(titulo, 14, 17);
  doc.setFontSize(10); doc.text("Recibo Digital", 100, 17);
  doc.setTextColor(45, 52, 54); doc.text(`Fecha: ${fecha} - ${hora}`, 14, 35);
  doc.text(`Pago: ${metodoPago}`, 14, 42); 

  const datosTabla = productos.map(p => [`${p.nombre} (T${p.talla})`, formatearSoles(p.precio)]);
  doc.autoTable({ startY: 50, head: [['Prenda', 'Importe']], body: datosTabla, theme: 'grid' });

  let finalY = doc.lastAutoTable.finalY || 50;
  doc.setFontSize(12); doc.text(`TOTAL: ${formatearSoles(totalVenta)}`, 14, finalY + 10);
  
  let miCodigoQR = "data:image/jpeg;base64,..."; // PEGA AQUÍ TU CÓDIGO QR GIGANTE
  try { doc.addImage(miCodigoQR, 'JPEG', 55, finalY + 15, 30, 30); } catch (e) {}
  
  doc.save(`Recibo_${titulo}_${fecha.replace(/\//g, '-')}.pdf`);
}

async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return notificar("⚠️ Carrito vacío", "advertencia");
  const btn = document.querySelector(".btn-finalizar");
  const pago = document.getElementById("metodo-pago").value; 
  const rol = localStorage.getItem("rolActivo");
  btn.innerText = "⏳..."; btn.disabled = true;
  try {
    await db.collection("ventas").add({ 
        fechaServidor: firebase.firestore.FieldValue.serverTimestamp(), 
        fechaTexto: new Date().toLocaleDateString("es-PE"), 
        hora: new Date().toLocaleTimeString("es-PE"), 
        productos: productosSeleccionados, total: Number(total), metodoPago: pago,
        origen: rol === "admin" ? "Local" : "Web"
    });
    generarPDFRecibo(productosSeleccionados, total, pago);
    if (rol === "admin") document.getElementById("modal-whatsapp").classList.add("modal-activo");
    else window.open(`https://wa.me/51977757369?text=Nuevo pedido por ${formatearSoles(total)}`, '_blank');
    productosSeleccionados = []; recalcularTotal(); guardarCarrito(); actualizarInterfaz();
  } catch (err) { notificar("❌ Error venta", "error"); } finally { btn.innerText = "Enviar Pedido 🚀"; btn.disabled = false; }
}

async function cargarReporteVentasSPA() {
  const div = document.getElementById("kpis-ventas");
  try {
    const snapVentas = await db.collection("ventas").get();
    const snapGastos = await db.collection("gastos").get();
    let totalV = 0, totalG = 0, resumenP = { "Efectivo": 0, "Yape/Plin": 0, "Tarjeta": 0, "Pedido Web": 0 };
    snapVentas.forEach(doc => { let v = doc.data(); totalV += v.total; resumenP[v.metodoPago || "Efectivo"] += v.total; });
    snapGastos.forEach(doc => totalG += doc.data().monto);
    div.innerHTML = `<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; text-align:center;">
      <div style="background:#3498db; color:white; padding:10px; border-radius:10px;">Ingresos<br><b>${formatearSoles(totalV)}</b></div>
      <div style="background:#e74c3c; color:white; padding:10px; border-radius:10px;">Gastos<br><b>${formatearSoles(totalG)}</b></div>
      <div style="background:#27ae60; color:white; padding:10px; border-radius:10px;">Neto<br><b>${formatearSoles(totalV-totalG)}</b></div>
    </div>`;
  } catch (e) { div.innerHTML = "Error reportes."; }
}

function reimprimirRecibo(index) {
   const v = ventasHistorialCache[index];
   generarPDFRecibo(v.productos, v.total, v.metodoPago, v.fechaTexto, v.hora);
}

async function cargarHistorialSPA() {
  const ul = document.getElementById("ventasDia");
  ul.innerHTML = "⏳...";
  try {
    const snap = await db.collection("ventas").orderBy("fechaServidor", "desc").limit(30).get();
    ventasHistorialCache = snap.docs.map(doc => doc.data());
    ul.innerHTML = ventasHistorialCache.map((v, i) => `
      <li style="background:var(--tarjetas); padding:10px; border-radius:10px; margin-bottom:10px; border-left:4px solid var(--principal);">
        <small>${v.fechaTexto} - ${v.hora}</small><br><b>${v.total} soles</b><br>
        <button onclick="reimprimirRecibo(${i})" style="font-size:10px; padding:5px; background:#3498db; color:white; border:none; border-radius:5px;">📄 PDF</button>
      </li>`).join('');
  } catch (e) { ul.innerHTML = "Error historial."; }
}

async function guardarGasto() {
  const mot = document.getElementById("gasto-motivo").value;
  const mon = Number(document.getElementById("gasto-monto").value);
  if (!mot || !mon) return notificar("⚠️ Datos incompletos", "error");
  await db.collection("gastos").add({ motivo: mot, monto: mon, fechaServidor: firebase.firestore.FieldValue.serverTimestamp(), fechaTexto: new Date().toLocaleDateString("es-PE") });
  document.getElementById("gasto-motivo").value = ""; document.getElementById("gasto-monto").value = "";
  notificar("✅ Gasto guardado"); cargarGastosSPA();
}

async function cargarGastosSPA() {
  const div = document.getElementById("lista-gastos");
  const snap = await db.collection("gastos").orderBy("fechaServidor", "desc").get();
  div.innerHTML = snap.docs.map(doc => `<li>${doc.data().motivo}: -${formatearSoles(doc.data().monto)}</li>`).join('');
}

async function cargarClientesSPA() {
  const div = document.getElementById("lista-clientes");
  const snap = await db.collection("clientes").get();
  div.innerHTML = snap.docs.map(doc => `<li>👤 ${doc.data().nombre} - ${doc.data().celular}</li>`).join('');
}

function cerrarModalWhatsApp() { document.getElementById("modal-whatsapp").classList.remove("modal-activo"); }
function enviarWhatsApp() { 
    const num = document.getElementById("wa-numero").value;
    window.open(`https://wa.me/51${num}?text=Gracias por tu compra`, '_blank');
    cerrarModalWhatsApp();
}
