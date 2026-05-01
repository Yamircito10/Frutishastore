// ==========================================
// 📦 LÓGICA DE ALMACÉN Y STOCK
// ==========================================

async function ajustarStock(prendaId, tallaNumero, delta) {
  return db.runTransaction(async (tx) => {
    const ref = db.collection("inventario").doc(prendaId);
    const snap = await tx.get(ref);
    const data = snap.data();
    const tallas = Array.isArray(data.tallas) ? [...data.tallas] : [];
    const idx = tallas.findIndex(x => String(x.talla).trim() === String(tallaNumero).trim());
    
    if (idx === -1) throw new Error("Talla no encontrada");
    
    const actual = Number(tallas[idx].stockTalla || 0) + delta;
    tallas[idx].stockTalla = actual;
    const nuevoTotal = tallas.reduce((acc, x) => acc + Number(x.stockTalla || 0), 0);
    
    tx.update(ref, { tallas, stock: nuevoTotal });
    registrarMovimiento(data.nombre, tallaNumero, Math.abs(delta), delta > 0 ? "suma" : "resta");
    return { nuevoTotal, tallas };
  });
}

async function cargarInventarioSPA() {
  const div = document.getElementById("admin-inventario");
  div.innerHTML = "<p>⏳ Cargando...</p>";
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    div.innerHTML = prendas.map(p => {
      let stockColor = p.stock > 5 ? '#27ae60' : (p.stock > 0 ? '#f39c12' : '#e74c3c');
      return `
      <div class="producto-card" style="border-left: 5px solid ${stockColor};">
        <div style="display: flex; justify-content: space-between;">
            <strong>${p.nombre}</strong> 
            <span style="color: ${stockColor}; font-weight: bold;">Stock: ${p.stock || 0}</span>
        </div>
        <p style="font-size: 12px; color: #666; margin: 5px 0;">S/ ${p.precio} | ${p.categoria}</p>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
            <button onclick="abrirEdicionInfo('${p.id}')" style="background:#f39c12; color:white; border:none; padding:8px; border-radius:5px; flex:1;">✏️ Info</button>
            <button onclick="abrirEdicionStock('${p.id}')" style="background:#3498db; color:white; border:none; padding:8px; border-radius:5px; flex:1;">📦 Stock</button>
            <button onclick="eliminarPrendaAdmin('${p.id}')" style="background:#e74c3c; color:white; border:none; padding:8px; border-radius:5px; width:40px;">🗑️</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) { div.innerHTML = "Error cargando."; }
}

// MODAL EDITAR INFO
let prendaEditandoInfoId = null;
function abrirEdicionInfo(id) {
  const p = prendas.find(x => x.id === id);
  if(!p) return;
  prendaEditandoInfoId = id;
  document.getElementById("edit-nombre").value = p.nombre;
  document.getElementById("edit-precio").value = p.precio;
  document.getElementById("edit-categoria").value = p.categoria || "Niñas";
  document.getElementById("modal-editar").classList.add("modal-activo");
}

function cerrarModalEditar() { document.getElementById("modal-editar").classList.remove("modal-activo"); }

async function guardarEdicionInfo() {
  const nom = document.getElementById("edit-nombre").value;
  const pre = Number(document.getElementById("edit-precio").value);
  const cat = document.getElementById("edit-categoria").value;
  const files = document.getElementById("edit-imagen-file").files;
  
  const btn = document.getElementById("btn-guardar-edicion");
  btn.innerText = "⏳..."; btn.disabled = true;

  try {
    let urls = prendas.find(x => x.id === prendaEditandoInfoId).imagenes || [];
    if(files.length > 0) {
      urls = [];
      for(let f of files) {
        const fd = new FormData(); fd.append("image", f);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {method:"POST", body:fd});
        const d = await res.json(); if(d.success) urls.push(d.data.url);
      }
    }
    await db.collection("inventario").doc(prendaEditandoInfoId).update({ nombre: nom, precio: pre, categoria: cat, imagenes: urls });
    notificar("✅ Actualizado"); cerrarModalEditar(); cargarInventarioSPA();
  } catch(e) { notificar("Error"); } finally { btn.innerText = "💾 Guardar"; btn.disabled = false; }
}

// MODAL STOCK Y TECLADO
let prendaEditandoId = null; let tallaEditando = null; let cantidadTeclado = "0";

function abrirEdicionStock(id) {
  prendaEditandoId = id; const p = prendas.find(x => x.id === id);
  document.getElementById("modal-stock-titulo").innerText = p.nombre;
  document.getElementById("modal-paso-tallas").style.display = "block";
  document.getElementById("modal-paso-teclado").style.display = "none";
  const cont = document.getElementById("modal-tallas-botones");
  cont.innerHTML = p.tallas.map(t => `<button onclick="seleccionarTallaTeclado('${t.talla}')" style="padding:10px; border-radius:10px; border:1px solid #ddd; background:white;">T${t.talla}</button>`).join('');
  document.getElementById("modal-stock").classList.add("modal-activo");
}

function seleccionarTallaTeclado(t) {
  tallaEditando = t; cantidadTeclado = "0";
  document.getElementById("pantalla-cantidad").innerText = "0";
  document.getElementById("modal-paso-tallas").style.display = "none";
  document.getElementById("modal-paso-teclado").style.display = "block";
}

function teclear(v) {
  if(v === 'C') cantidadTeclado = "0";
  else { cantidadTeclado = cantidadTeclado === "0" ? String(v) : cantidadTeclado + String(v); }
  document.getElementById("pantalla-cantidad").innerText = cantidadTeclado;
}

function cerrarModalStock() { document.getElementById("modal-stock").classList.remove("modal-activo"); }

async function confirmarStockTeclado() {
  const cant = parseInt(cantidadTeclado);
  if(cant <= 0) return;
  try {
    await ajustarStock(prendaEditandoId, tallaEditando, cant);
    notificar("✅ Stock sumado"); cerrarModalStock(); cargarInventarioSPA();
  } catch(e) { notificar("Error"); }
}

async function registrarMovimiento(prendaNombre, talla, cantidad, tipo) {
  await db.collection("movimientos").add({ 
    prendaNombre, talla, cantidad, tipo, 
    usuario: localStorage.getItem("usuarioActivo") || "Admin",
    fechaTexto: new Date().toLocaleDateString("es-PE"),
    hora: new Date().toLocaleTimeString("es-PE"),
    fechaServidor: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function cargarHistorialMovimientosSPA() {
  const div = document.getElementById("historial-movimientos");
  const snap = await db.collection("movimientos").orderBy("fechaServidor", "desc").limit(20).get();
  div.innerHTML = snap.docs.map(doc => {
    const m = doc.data();
    return `<div style="font-size:11px; border-bottom:1px solid #eee; padding:5px 0;"><b>${m.fechaTexto}</b>: ${m.prendaNombre} T${m.talla} (${m.tipo == 'suma' ? '+' : '-'}${m.cantidad})</div>`;
  }).join('');
}

function eliminarPrendaAdmin(id) { if(confirm("¿Eliminar?")) db.collection("inventario").doc(id).delete().then(() => cargarInventarioSPA()); }
