// ==========================================
// LUDAVA STORE - INVENTARIO (inventario.js)
// ==========================================

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

    registrarMovimiento(data.nombre, tallaNumero, Math.abs(delta), delta > 0 ? "suma" : "resta");
    return { nuevoTotal, tallas };
  });
}

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
      let textoTallas = "Ninguna";
      if (Array.isArray(p.tallas) && p.tallas.length > 0) textoTallas = p.tallas.map(t => `T${t.talla}(${t.stockTalla})`).join(', ');
      
      let cantFotos = p.imagenes ? p.imagenes.length : (p.imagen ? 1 : 0);

      html += `<li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; border-left: 5px solid ${stockColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #333;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>${p.nombre}</strong> 
                    <span style="color: ${stockColor}; font-weight: bold;">Stock: ${p.stock || 0}</span>
                </div>
                <div style="font-size: 13px; color: #666; margin-bottom: 10px;">
                  Precio: S/${p.precio} | Cat: ${p.categoria || 'Unisex'} | Tallas: ${textoTallas} | 📸 ${cantFotos} fotos
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="eliminarPrendaAdmin('${p.id}')" style="background: #e74c3c; color: white; border: none; padding: 8px; border-radius: 5px; flex: 1; cursor: pointer; font-weight: bold;">🗑️</button>
                    <button onclick="abrirEdicionInfo('${p.id}')" style="background: #f39c12; color: white; border: none; padding: 8px; border-radius: 5px; flex: 1; cursor: pointer; font-weight: bold;">✏️ Info</button>
                    <button onclick="abrirEdicionStock('${p.id}')" style="background: #3498db; color: white; border: none; padding: 8px; border-radius: 5px; flex: 1; cursor: pointer; font-weight: bold;">📦 Stock</button>
                </div>
               </li>`;
    });
    div.innerHTML = html + `</ul>`;
  } catch (e) { div.innerHTML = "<p>Error cargando el almacén.</p>"; }
}

async function guardarNuevaPrenda() {
  const nombre = document.getElementById("nuevo-nombre").value.trim();
  const precio = Number(document.getElementById("nuevo-precio").value);
  const categoria = document.getElementById("nuevo-categoria").value;
  const tallasInput = document.getElementById("nuevas-tallas").value.trim();
  const archivosFotos = document.getElementById("nueva-imagen-file").files; 
  
  if (!nombre || !precio) return notificar("⚠️ Llena el nombre y precio", "advertencia");
  
  let tallasArray = [];
  if (tallasInput) tallasArray = tallasInput.split(',').map(t => ({ talla: t.trim(), stockTalla: 0, precio: precio }));

  const btnGuardar = document.getElementById("btn-guardar-prenda");
  btnGuardar.innerText = "⏳ Subiendo fotos..."; 
  btnGuardar.disabled = true;

  try {
    let urlsImagenes = [];

    if (archivosFotos.length > 0) {
      notificar(`📸 Subiendo ${Math.min(archivosFotos.length, 4)} imágenes a la nube...`, "exito");
      for (let i = 0; i < archivosFotos.length; i++) {
         if (i >= 4) break; 
         const formData = new FormData();
         formData.append("image", archivosFotos[i]);
         
         const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
         const data = await response.json();
         if (data.success) urlsImagenes.push(data.data.url);
      }
    }

    await db.collection("inventario").add({ 
      nombre, 
      precio, 
      categoria, 
      stock: 0, 
      tallas: tallasArray, 
      imagenes: urlsImagenes 
    });

    document.getElementById("nuevo-nombre").value = ""; document.getElementById("nuevo-precio").value = "";
    document.getElementById("nuevas-tallas").value = ""; document.getElementById("nueva-imagen-file").value = "";
    
    notificar("✅ Prenda creada con éxito", "exito");
    cargarInventarioSPA(); cargarPrendas();
  } catch (error) { notificar("❌ Error guardando prenda", "error"); 
  } finally { btnGuardar.innerText = "💾 Guardar Prenda"; btnGuardar.disabled = false; }
}

async function eliminarPrendaAdmin(id) {
  if(!confirm("¿Seguro que deseas eliminar esta prenda por completo?")) return;
  try { await db.collection("inventario").doc(id).delete(); notificar("🗑️ Prenda eliminada"); cargarInventarioSPA(); cargarPrendas();
  } catch (error) { notificar("❌ Error eliminando", "error"); }
}

let prendaEditandoInfoId = null;
function abrirEdicionInfo(id) {
  const prenda = prendas.find(p => p.id === id); if(!prenda) return;
  prendaEditandoInfoId = id;
  document.getElementById("edit-nombre").value = prenda.nombre;
  document.getElementById("edit-precio").value = prenda.precio;
  document.getElementById("edit-categoria").value = prenda.categoria || "Unisex";
  document.getElementById("edit-imagen-file").value = ""; 
  document.getElementById("modal-editar").classList.add("modal-activo");
}

function cerrarModalEditar() { document.getElementById("modal-editar").classList.remove("modal-activo"); prendaEditandoInfoId = null; }

async function guardarEdicionInfo() {
  const nuevoNombre = document.getElementById("edit-nombre").value.trim();
  const nuevoPrecio = Number(document.getElementById("edit-precio").value);
  const nuevaCategoria = document.getElementById("edit-categoria").value;
  const archivosFotos = document.getElementById("edit-imagen-file").files;

  if(!nuevoNombre || !nuevoPrecio) return notificar("⚠️ Llena ambos campos", "advertencia");
  
  const btnGuardar = document.getElementById("btn-guardar-edicion");
  btnGuardar.innerText = "⏳ Guardando..."; btnGuardar.disabled = true;

  try {
    const prenda = prendas.find(p => p.id === prendaEditandoInfoId);
    let tallasActualizadas = [];
    if (prenda && prenda.tallas) tallasActualizadas = prenda.tallas.map(t => ({...t, precio: nuevoPrecio}));
    
    let urlsFinales = prenda.imagenes || (prenda.imagen ? [prenda.imagen] : []); 

    if (archivosFotos.length > 0) {
      urlsFinales = []; 
      notificar(`📸 Subiendo ${Math.min(archivosFotos.length, 4)} nuevas imágenes...`, "exito");
      for (let i = 0; i < archivosFotos.length; i++) {
         if (i >= 4) break; 
         const formData = new FormData();
         formData.append("image", archivosFotos[i]);
         
         const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
         const data = await response.json();
         if (data.success) urlsFinales.push(data.data.url);
      }
    }

    await db.collection("inventario").doc(prendaEditandoInfoId).update({ 
      nombre: nuevoNombre, 
      precio: nuevoPrecio, 
      categoria: nuevaCategoria, 
      tallas: tallasActualizadas, 
      imagenes: urlsFinales 
    });

    notificar("✅ Información actualizada", "exito");
    cerrarModalEditar(); cargarInventarioSPA(); cargarPrendas();
  } catch(error) { notificar("❌ Error al actualizar", "error"); 
  } finally { btnGuardar.innerText = "💾 Guardar"; btnGuardar.disabled = false; }
}

let prendaEditandoId = null; let tallaEditando = null; let cantidadTeclado = "0";
function abrirEdicionStock(id) {
  prendaEditandoId = id; const prenda = prendas.find(p => p.id === id); if (!prenda) return;
  document.getElementById("modal-stock-titulo").innerText = `${prenda.nombre}`; document.getElementById("modal-paso-tallas").style.display = "block"; document.getElementById("modal-paso-teclado").style.display = "none";
  const contenedorTallas = document.getElementById("modal-tallas-botones"); contenedorTallas.innerHTML = "";
  if(prenda.tallas && prenda.tallas.length > 0) { prenda.tallas.forEach(t => { const btn = document.createElement("button"); btn.innerText = `T${t.talla}`; btn.onclick = () => seleccionarTallaTeclado(t.talla); contenedorTallas.appendChild(btn); });
  } else { contenedorTallas.innerHTML = "<p>No hay tallas.</p>"; }
  document.getElementById("modal-stock").classList.add("modal-activo");
}

function seleccionarTallaTeclado(talla) { tallaEditando = talla; cantidadTeclado = "0"; document.getElementById("pantalla-cantidad").innerText = cantidadTeclado; document.getElementById("talla-seleccionada-txt").innerText = `${talla}`; document.getElementById("modal-paso-tallas").style.display = "none"; document.getElementById("modal-paso-teclado").style.display = "block"; }
function teclear(valor) { if (valor === 'C') cantidadTeclado = "0"; else { if (cantidadTeclado === "0") cantidadTeclado = String(valor); else cantidadTeclado += String(valor); } if(cantidadTeclado.length > 4) cantidadTeclado = cantidadTeclado.slice(0, 4); document.getElementById("pantalla-cantidad").innerText = cantidadTeclado; }
function cerrarModalStock() { document.getElementById("modal-stock").classList.remove("modal-activo"); prendaEditandoId = null; tallaEditando = null; }

async function confirmarStockTeclado() {
  const cantidad = parseInt(cantidadTeclado); if (isNaN(cantidad) || cantidad <= 0) return notificar("⚠️ Ingresa una cantidad mayor a 0", "advertencia");
  const btnConfirmar = document.getElementById("btn-confirmar-teclado"); btnConfirmar.innerText = "⏳"; btnConfirmar.disabled = true;
  try { await ajustarStock(prendaEditandoId, tallaEditando, cantidad); notificar(`✅ ${cantidad} agregados a la T${tallaEditando}`); cerrarModalStock(); cargarInventarioSPA(); cargarPrendas();        
  } catch (error) { notificar("❌ Error: " + error.message, "error"); } finally { btnConfirmar.innerText = "✔"; btnConfirmar.disabled = false; }
}

async function registrarMovimiento(prendaNombre, talla, cantidad, tipo) {
  try { await db.collection("movimientos").add({ prendaNombre, talla, cantidad, tipo, usuario: localStorage.getItem("usuarioActivo") || "Desconocido", fechaServidor: firebase.firestore.FieldValue.serverTimestamp(), fechaTexto: new Date().toLocaleDateString("es-PE"), hora: new Date().toLocaleTimeString("es-PE") }); } catch (e) {}
}
async function cargarHistorialMovimientosSPA() {
  const div = document.getElementById("historial-movimientos"); if (!div) return;
  try {
    const snap = await db.collection("movimientos").orderBy("fechaServidor", "desc").limit(50).get();
    if (snap.empty) return div.innerHTML = "<p style='text-align:center; color:#888;'>No hay movimientos registrados.</p>";
    div.innerHTML = snap.docs.map(doc => {
      const m = doc.data(); const color = m.tipo === "suma" ? "#2ecc71" : "#e74c3c"; const signo = m.tipo === "suma" ? "+" : "-";
      return `<div style="font-size:13px; padding:10px; border-bottom:1px solid var(--borde); display:flex; justify-content:space-between; align-items:center; color:var(--texto);"><div><strong>${m.fechaTexto} - ${m.hora}</strong><br><span>👕 ${m.prendaNombre} (Talla: ${m.talla})</span><br><small style="color:#888;">👤 Por: ${m.usuario}</small></div><span style="color:${color}; font-weight:bold; font-size: 16px;">${signo}${m.cantidad}</span></div>`;
    }).join("");
  } catch (e) {}
}
