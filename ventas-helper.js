// ventas-helper.js
// Funciones compartidas para ventas y reportes

// ✅ Dar formato a soles peruanos
function formatearSoles(valor) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);
}

// ✅ Descargar ventas en formato TXT
function descargarTxt(ventas, fecha) {
  if (!ventas || ventas.length === 0) {
    alert("⚠️ No hay ventas para exportar.");
    return;
  }

  const fechaFinal = fecha || new Date().toISOString().slice(0, 10);
  let contenido = "🛍️ Ventas del Día - Frutisha Store\n\n";

  ventas.forEach((venta, i) => {
    contenido += `Venta ${i + 1} - ${venta.hora}\n`;
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