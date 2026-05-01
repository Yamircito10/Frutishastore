// ==========================================
// 📦 MODAL: EDITAR STOCK / TECLADO
// ==========================================
let prendaEditandoId = null; 
let tallaEditando = null; 
let cantidadTeclado = "0";

function abrirEdicionStock(id) {
  prendaEditandoId = id; 
  const p = prendas.find(x => x.id === id);
  if (!p) return notificar("⚠️ Prenda no encontrada", "error");

  document.getElementById("modal-stock-titulo").innerText = p.nombre;
  document.getElementById("modal-paso-tallas").style.display = "block";
  document.getElementById("modal-paso-teclado").style.display = "none";
  
  const cont = document.getElementById("modal-tallas-botones");
  cont.innerHTML = ""; // Limpiamos antes de llenar

  // 🛡️ BLINDAJE: Si la prenda tiene tallas, creamos los botones. Si no, avisamos.
  if (p.tallas && Array.isArray(p.tallas) && p.tallas.length > 0) {
      cont.innerHTML = p.tallas.map(t => 
        `<button onclick="seleccionarTallaTeclado('${t.talla}')" style="padding:15px; margin: 5px; border-radius:10px; border:2px solid var(--principal); background:var(--fondo); color:var(--texto); font-weight:bold; font-size:16px; cursor:pointer;">Talla ${t.talla}</button>`
      ).join('');
  } else {
      cont.innerHTML = `<p style="color:#e74c3c; font-size:14px; font-weight:bold;">⚠️ Esta prenda no tiene tallas configuradas.</p>
                        <p style="font-size:12px; color:var(--texto);">Ve al botón "✏️ Info" y agrégale tallas separadas por coma (Ej: S, M, L) para poder subirle stock.</p>`;
  }

  document.getElementById("modal-stock").classList.add("modal-activo");
}

function seleccionarTallaTeclado(talla) { 
    tallaEditando = talla; 
    cantidadTeclado = "0"; 
    document.getElementById("pantalla-cantidad").innerText = cantidadTeclado; 
    
    const txtTalla = document.getElementById("talla-seleccionada-txt");
    if(txtTalla) txtTalla.innerText = talla;

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
      notificar(`✅ ${cantidad} prendas sumadas a la T${tallaEditando}`, "exito"); 
      cerrarModalStock(); 
      cargarInventarioSPA(); 
      if(typeof cargarPrendas === "function") cargarPrendas(); // 🔄 Actualizamos la tienda para que el cliente lo vea al instante
  } catch (error) { 
      notificar("❌ Error: " + error.message, "error"); 
  } finally { 
      btnConfirmar.innerText = "✔"; btnConfirmar.disabled = false; 
  }
}

// ==========================================
// 🕵️‍♂️ HISTORIAL DE MOVIMIENTOS
// ==========================================
async function registrarMovimiento(prendaNombre, talla, cantidad, tipo) {
  try {
      await db.collection("movimientos").add({ 
        prendaNombre, talla, cantidad, tipo, 
        usuario: localStorage.getItem("usuarioActivo") || "Admin",
        fechaTexto: new Date().toLocaleDateString("es-PE"),
        hora: new Date().toLocaleTimeString("es-PE"),
        fechaServidor: firebase.firestore.FieldValue.serverTimestamp()
      });
  } catch(e) {}
}

async function cargarHistorialMovimientosSPA() {
  const div = document.getElementById("historial-movimientos");
  if(!div) return;
  try {
      const snap = await db.collection("movimientos").orderBy("fechaServidor", "desc").limit(20).get();
      div.innerHTML = snap.docs.map(doc => {
        const m = doc.data();
        const color = m.tipo === 'suma' ? '#2ecc71' : '#e74c3c';
        const signo = m.tipo === 'suma' ? '+' : '-';
        return `<div style="font-size:12px; border-bottom:1px solid var(--borde); padding:8px 0; color:var(--texto); display:flex; justify-content:space-between;">
                  <div><b>${m.fechaTexto} - ${m.hora}</b><br>👤 ${m.usuario} <br>👕 ${m.prendaNombre} (T${m.talla})</div>
                  <div style="color:${color}; font-weight:bold; font-size:16px;">${signo}${m.cantidad}</div>
                </div>`;
      }).join('');
  } catch (e) { div.innerHTML = "Error cargando movimientos"; }
}

function eliminarPrendaAdmin(id) { 
    if(confirm("¿Seguro que deseas eliminar esta prenda?")) {
        db.collection("inventario").doc(id).delete().then(() => {
            notificar("🗑️ Prenda eliminada", "advertencia");
            cargarInventarioSPA();
            if(typeof cargarPrendas === "function") cargarPrendas();
        });
    } 
}
