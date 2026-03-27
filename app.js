// ==========================================
//  FRUTISHA STORE - CEREBRO SPA (app.js)
// ==========================================

let total = 0;
let productosSeleccionados = [];
let prendas = [];

const formatearSoles = (valor) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

function notificar(mensaje, tipo = "exito") {
  let colorFondo = tipo === "exito" ? "#2ecc71" : tipo === "error" ? "#e74c3c" : "#f39c12";
  Toastify({ text: mensaje, duration: 2500, gravity: "bottom", position: "center", style: { background: colorFondo, borderRadius: "10px", fontWeight: "bold", fontSize: "15px", boxShadow: "0 4px 6px rgba(0,0,0,0.2)" } }).showToast();
}

// 🧮 NUEVA FUNCIÓN MÁGICA: Cuenta todo desde cero para no equivocarse nunca
function recalcularTotal() {
  total = productosSeleccionados.reduce((suma, prod) => suma + Number(prod.precio), 0);
}

// ==========================================
// 1. LÓGICA DE LA TIENDA Y CARRITO
// ==========================================
async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    generarVistaPrendas();
  } catch (error) { notificar("❌ Error cargando el inventario.", "error"); }
}

function generarVistaPrendas() {
  const contenedor = document.getElementById("lista-prendas");
  if(!contenedor) return;
  contenedor.innerHTML = "";
  if (prendas.length === 0) return contenedor.innerHTML = "<p>⚠️ No hay productos.</p>";

  prendas.forEach(prenda => {
    const div = document.createElement("div");
    div.className = "producto-card";
    const titulo = document.createElement("h3");
    titulo.innerText = `${prenda.nombre} (Stock: ${prenda.stock ?? 0})`;
    div.appendChild(titulo);
    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";

    const tallas = Array.isArray(prenda.tallas) ? prenda.tallas : [];
    tallas.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "boton-talla";
      btn.innerText = `T${t.talla}`;
      btn.disabled = (t.stockTalla ?? 0) <= 0;
      btn.onclick = () => mostrarDescuentos(div, prenda, t);
      tallasDiv.appendChild(btn);
    });

    div.appendChild(tallasDiv);
    const descDiv = document.createElement("div");
    descDiv.className = "descuentos";
    div.appendChild(descDiv);
    contenedor.appendChild(div);
  });
  filtrarPrendas();
}

function filtrarPrendas() {
  const input = document.getElementById("buscador-prendas");
  if (!input) return;
  const textoFiltro = input.value.toLowerCase();
  document.querySelectorAll(".producto-card").forEach(tarjeta => {
    tarjeta.style.display = tarjeta.querySelector("h3").innerText.toLowerCase().includes(textoFiltro) ? "flex" : "none";
  });
}

function mostrarDescuentos(contenedor, prenda, tallaSel) {
  const descDiv = contenedor.querySelector(".descuentos");
  descDiv.innerHTML = "";
  const precioBase = (tallaSel.precio ?? prenda.precio);
  
  [0, 1, 2].forEach(desc => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = desc === 0 ? `Normal: S/${precioBase}` : `-S/${desc}`;
    btn.onclick = () => agregarProducto(prenda, tallaSel, Number(precioBase) - desc);
    descDiv.appendChild(btn);
  });
}

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
    return { nuevoTotal, tallas };
  });
}

async function agregarProducto(prenda, tallaSel, precioFinal) {
  try {
    const res = await ajustarStock(prenda.id, tallaSel.talla, -1);
    const idx = prendas.findIndex(p => p.id === prenda.id);
    if (idx !== -1) { prendas[idx].tallas = res.tallas; prendas[idx].stock = res.nuevoTotal; }
    
    productosSeleccionados.push({ id: prenda.id, nombre: prenda.nombre, talla: tallaSel.talla, precio: Number(precioFinal), texto: `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}` });
    recalcularTotal();
    
    guardarCarrito(); generarVistaPrendas(); actualizarInterfaz();
    notificar(`🛒 ${prenda.nombre} T${tallaSel.talla} agregado`, "exito");
  } catch (error) { notificar("⚠️ No se pudo agregar: " + error.message, "error"); }
}

async function eliminarProducto(index) {
  const prod = productosSeleccionados[index];
  if (!prod) return;
  try {
    const res = await ajustarStock(prod.id, prod.talla, +1);
    const idx = prendas.findIndex(p => p.id === prod.id);
    if (idx !== -1) { prendas[idx].tallas = res.tallas; prendas[idx].stock = res.nuevoTotal; }
    
    productosSeleccionados.splice(index, 1);
    recalcularTotal();
    
    guardarCarrito(); generarVistaPrendas(); actualizarInterfaz();
    notificar("🗑️ Producto retirado", "advertencia");
  } catch (error) { notificar("⚠️ Error devolviendo stock", "error"); }
}

function actualizarInterfaz() {
  const totalDiv = document.getElementById("total");
  if(totalDiv) totalDiv.innerText = `Total: ${formatearSoles(total)}`;
  const ul = document.getElementById("productos");
  if(ul) {
    ul.innerHTML = "";
    productosSeleccionados.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span style="flex:1;">${p.texto}</span><button style="background:#ff7675; border:none; color:white; border-radius:5px; padding:5px 10px; cursor:pointer;" onclick="eliminarProducto(${i})">❌</button>`;
      ul.appendChild(li);
    });
  }
}

function guardarCarrito() { localStorage.setItem("carrito", JSON.stringify({ productos: productosSeleccionados, total })); }

function cargarCarrito() {
  try {
    const data = localStorage.getItem("carrito");
    if (data) { 
      const parsed = JSON.parse(data); 
      productosSeleccionados = parsed.productos || []; 
      recalcularTotal(); 
    }
  } catch (e) { productosSeleccionados = []; total = 0; }
}

function reiniciarCarrito() {
  if (productosSeleccionados.length === 0) return notificar("El carrito ya está vacío", "advertencia");
  if (!confirm("¿Vaciar carrito? No se devolverá el stock automáticamente.")) return;
  
  productosSeleccionados = []; 
  recalcularTotal(); 
  
  localStorage.removeItem("carrito"); 
  actualizarInterfaz(); 
  notificar("🔄 Carrito vaciado", "exito");
}

// --- AQUÍ ESTÁ LA NUEVA MAGIA DE WHATSAPP ---
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return notificar("⚠️ Agrega productos", "advertencia");
  const btn = document.querySelector(".btn-finalizar");
  btn.innerText = "⏳ Procesando..."; btn.disabled = true;
  
  try {
    await db.collection("ventas").add({
      fechaServidor: firebase.firestore.FieldValue.serverTimestamp(),
      fechaTexto: new Date().toLocaleDateString("es-PE"),
      hora: new Date().toLocaleTimeString("es-PE"),
      productos: productosSeleccionados,
      total: Number(total)
    });

    let textoWa = `*🛍️ FRUTISHA STORE*\n`;
    textoWa += `¡Gracias por tu compra!\n\n`;
    textoWa += `*Detalle de tu pedido:*\n`;
    productosSeleccionados.forEach(p => {
      textoWa += `▪️ ${p.nombre} (Talla ${p.talla}) -> ${formatearSoles(p.precio)}\n`;
    });
    textoWa += `\n*Total Pagado: ${formatearSoles(total)}*\n`;
    textoWa += `\n¡Vuelve pronto! ✨`;

    if(confirm("✅ Venta registrada correctamente.\n\n¿Deseas enviar el recibo al cliente por WhatsApp?")) {
      
      // Pedimos el número al vendedor
      let numeroCliente = prompt("📱 Ingresa el número de celular del cliente (Ej: 987654321):\n\n(Si lo dejas en blanco, podrás elegir el contacto directo en tu WhatsApp)");
      
      if (numeroCliente && numeroCliente.trim() !== "") {
        // Limpiamos por si puso espacios
        numeroCliente = numeroCliente.replace(/\D/g, '');
        // Si puso los 9 dígitos de Perú, le agregamos el código 51 automático
        if (numeroCliente.length === 9) {
          numeroCliente = "51" + numeroCliente;
        }
        // Abrimos el chat directo con el número
        const urlWa = `https://wa.me/${numeroCliente}?text=${encodeURIComponent(textoWa)}`;
        window.open(urlWa, '_blank');
      } else {
        // Si no puso número, abre WhatsApp normal para elegir el contacto manual
        const urlWa = `https://wa.me/?text=${encodeURIComponent(textoWa)}`;
        window.open(urlWa, '_blank');
      }
    }

    productosSeleccionados = []; 
    recalcularTotal(); 
    guardarCarrito(); 
    actualizarInterfaz();
    notificar("✅ ¡Venta finalizada exitosamente!", "exito");
  } catch (err) { 
    notificar("❌ Error guardando la venta", "error"); 
  } finally { 
    btn.innerText = "💰 FINALIZAR VENTA"; btn.disabled = false; 
  }
}

// ==========================================
// 2. MAGIA DE LA NAVEGACIÓN SPA
// ==========================================
window.navegarSPA = function(idDestino) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('pantalla-activa'));
  document.getElementById(idDestino).classList.add('pantalla-activa');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (idDestino === 'vista-historial') cargarHistorialSPA();
  if (idDestino === 'vista-ventas') cargarReporteVentasSPA();
  if (idDestino === 'vista-tallas') cargarReporteTallasSPA();
  if (idDestino === 'vista-inventario') cargarInventarioSPA();
};

async function cargarHistorialSPA() {
  const ul = document.getElementById("ventasDia");
  ul.innerHTML = "<li style='text-align:center;'>⏳ Buscando ventas...</li>";
  try {
    const snap = await db.collection("ventas").orderBy("fechaServidor", "desc").limit(30).get();
    if(snap.empty) return ul.innerHTML = "<li style='text-align:center;'>No hay ventas aún.</li>";
      
