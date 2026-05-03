// ==========================================
// LUDAVA STORE - VENTAS Y REPORTES (ventas.js)
// ==========================================

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

  let miCodigoQR = "data:image/jpeg;base64,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", "x"),
            ("y", 15, "y")
          ]
      }
    }, { merge: true });

    notificar("🎨 Diseño aplicado con éxito", "exito");
    cerrarModalDiseno();
    await cargarConfiguracion(); // Recarga al instante
  } catch(e) {
      notificar("❌ Error al guardar diseño", "error");
  } finally {
      btnGuardar.innerText = "💾 Aplicar Cambios"; btnGuardar.disabled = false;
  }
}
