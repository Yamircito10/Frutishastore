// ventas-helper.js
// Funciones compartidas para ventas y reportes

// =============================
// Formatear soles peruanos
// =============================
function formatearSoles(valor) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);
}

// =============================
// Descargar ventas en formato TXT
// =============================
function descargarTxt(ventas, fecha = null) {
  if (!ventas || ventas.length === 0) {
    alert("⚠️ No hay ventas para exportar.");
    return;
  }

  const fechaFinal = fecha || new Date().toISOString().slice(0, 10);
  let contenido = `🛍️ Ventas - Frutisha Store (${fechaFinal})\n\n`;

  ventas.forEach((venta, i) => {
    contenido += `Venta ${i + 1} - Usuario: ${venta.usuario || "desconocido"} - ${venta.hora}\n`;
    if (venta.productos && venta.productos.length > 0) {
      venta.productos.forEach(p => contenido += `  - ${p}\n`);
    }
    contenido += `Total: ${formatearSoles(venta.total)}\n-------------------------\n`;
  });

  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ventas_${fechaFinal}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// =============================
// Descargar Excel (XLSX)
// =============================
async function descargarExcel(ventas = [], nombreArchivo = "ventas") {
  if (!ventas || ventas.length === 0) {
    alert("⚠️ No hay ventas para exportar.");
    return;
  }

  // Cargar SheetJS dinámicamente si no existe
  if (typeof XLSX === "undefined") {
    await cargarScript("https://cdn.sheetjs.com/xlsx-0.19.5/package/dist/xlsx.full.min.js");
  }

  const data = ventas.map(v => ({
    Usuario: v.usuario || "desconocido",
    Fecha: v.fecha,
    Hora: v.hora,
    Productos: v.productos.join(", "),
    Total: v.total
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventas");

  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

// =============================
// Descargar PDF
// =============================
async function descargarPDF(ventas = [], nombreArchivo = "ventas") {
  if (!ventas || ventas.length === 0) {
    alert("⚠️ No hay ventas para exportar.");
    return;
  }

  // Cargar jsPDF y autoTable si no existen
  if (typeof jsPDF === "undefined") {
    await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }
  if (typeof jsPDF === "object" && !jsPDF.API.autoTable) {
    await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js");
  }

  const { jsPDF: jsPDFLib } = window.jspdf || window;
  const doc = new jsPDFLib();

  doc.setFontSize(16);
  doc.text("Historial de Ventas - Frutisha Store", 14, 20);

  const rows = ventas.map(v => [
    v.usuario || "desconocido",
    v.fecha,
    v.hora,
    v.productos.join(", "),
    formatearSoles(v.total)
  ]);

  doc.autoTable({
    head: [["Usuario", "Fecha", "Hora", "Productos", "Total"]],
    body: rows,
    startY: 30,
    styles: { fontSize: 10 }
  });

  doc.save(`${nombreArchivo}.pdf`);
}

// =============================
// Helper para cargar scripts dinámicamente
// =============================
function cargarScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}