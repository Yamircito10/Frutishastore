async function ajustarStock(prendaId, tallaNumero, delta) {
  return db.runTransaction(async (tx) => {
    const ref = db.collection("inventario").doc(prendaId);
    const snap = await tx.get(ref);
    const data = snap.data();
    const tallas = [...data.tallas];
    const idx = tallas.findIndex(x => String(x.talla) === String(tallaNumero));
    tallas[idx].stockTalla = Number(tallas[idx].stockTalla || 0) + delta;
    const nuevoTotal = tallas.reduce((acc, x) => acc + Number(x.stockTalla), 0);
    tx.update(ref, { tallas, stock: nuevoTotal });
    registrarMovimiento(data.nombre, tallaNumero, Math.abs(delta), delta > 0 ? "suma" : "resta");
    return { nuevoTotal, tallas };
  });
}

async function cargarInventarioSPA() {
  const div = document.getElementById("admin-inventario");
  const snap = await db.collection("inventario").get();
  prendas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  div.innerHTML = prendas.map(p => `
    <div style="background:white; padding:10px; margin-bottom:5px; border-radius:10px; color:#333;">
      <b>${p.nombre}</b> (Stock: ${p.stock})<br>
      <button onclick="abrirEdicionInfo('${p.id}')">✏️</button>
      <button onclick="abrirEdicionStock('${p.id}')">📦</button>
      <button onclick="eliminarPrendaAdmin('${p.id}')">🗑️</button>
    </div>`).join('');
}

async function guardarNuevaPrenda() {
  const nom = document.getElementById("nuevo-nombre").value;
  const pre = Number(document.getElementById("nuevo-precio").value);
  const cat = document.getElementById("nuevo-categoria").value;
  const tallasI = document.getElementById("nuevas-tallas").value;
  const files = document.getElementById("nueva-imagen-file").files;
  if (!nom || !pre) return notificar("⚠️ Faltan datos", "error");
  
  let urls = [];
  for (let f of files) {
      const fd = new FormData(); fd.append("image", f);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
      const d = await res.json(); if(d.success) urls.push(d.data.url);
  }
  
  await db.collection("inventario").add({ nombre: nom, precio: pre, categoria: cat, stock: 0, imagenes: urls, tallas: tallasI.split(',').map(t => ({ talla: t.trim(), stockTalla: 0 })) });
  notificar("✅ Guardado"); cargarInventarioSPA();
}

async function registrarMovimiento(nombre, talla, cant, tipo) {
  await db.collection("movimientos").add({ nombre, talla, cant, tipo, fecha: new Date().toLocaleString() });
}

async function cargarHistorialMovimientosSPA() {
  const div = document.getElementById("historial-movimientos");
  const snap = await db.collection("movimientos").orderBy("fecha", "desc").limit(20).get();
  div.innerHTML = snap.docs.map(doc => `<div>${doc.data().fecha}: ${doc.data().nombre} T${doc.data().talla} (${doc.data().tipo === 'suma' ? '+' : '-'}${doc.data().cant})</div>`).join('');
}

// FUNCIONES DE MODALES (Edit, Stock, Teclado)
function abrirEdicionStock(id) { /* abre modal stock */ }
function abrirEdicionInfo(id) { /* abre modal info */ }
function eliminarPrendaAdmin(id) { if(confirm("¿Eliminar?")) db.collection("inventario").doc(id).delete().then(() => cargarInventarioSPA()); }
