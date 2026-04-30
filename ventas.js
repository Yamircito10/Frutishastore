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
      doc.text(`CATÁLOGO - ${titulo}`, 105, 20, { align: "center" });
      let datos = prendas.map(p => [ p.nombre, p.categoria, p.tallas.map(t => `T${t.talla}`).join(','), formatearSoles(p.precio) ]);
      doc.autoTable({ startY: 45, head: [['Prenda', 'Cat', 'Tallas', 'Precio']], body: datos });
      doc.save(`Catalogo_${titulo}.pdf`);
  } catch (e) {} finally { btn.innerText = "📄 Catálogo"; btn.disabled = false; }
}

async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return;
  const btn = document.querySelector(".btn-finalizar");
  const pago = document.getElementById("metodo-pago").value; 
  btn.innerText = "⏳..."; btn.disabled = true;
  try {
    await db.collection("ventas").add({ 
        fechaServidor: firebase.firestore.FieldValue.serverTimestamp(), 
        fechaTexto: new Date().toLocaleDateString("es-PE"), 
        hora: new Date().toLocaleTimeString("es-PE"), 
        productos: productosSeleccionados, total: Number(total), metodoPago: pago 
    });
    generarPDFRecibo(productosSeleccionados, total, pago);
    if (localStorage.getItem("rolActivo") === "admin") document.getElementById("modal-whatsapp").classList.add("modal-activo");
    else window.open(`https://wa.me/51977757369?text=Pedido Realizado`, '_blank');
    productosSeleccionados = []; recalcularTotal(); guardarCarrito(); actualizarInterfaz();
  } catch (err) {} finally { btn.innerText = "Enviar Pedido 🚀"; btn.disabled = false; }
}

// COPIAR AQUÍ: generarPDFRecibo, reimprimirRecibo, enviarWhatsApp, cerrarModalWhatsApp de tu código anterior
// COPIAR AQUÍ: cargarReporteVentasSPA, cargarHistorialSPA, cargarReporteTallasSPA, cargarClientesSPA
// COPIAR AQUÍ: descargarReporteExcel, descargarReportePDF, reiniciarTodoElHistorial
// COPIAR AQUÍ: guardarGasto, cargarGastosSPA
