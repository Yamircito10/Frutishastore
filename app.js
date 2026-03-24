// =============================
//  Frutisha Store - Lógica Principal (app.js)
// =============================

// ✅ Variables globales
let total = 0;
let productosSeleccionados = [];
let prendas = [];

// ✅ Formatear soles
const formatearSoles = (valor) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

// =============================
//  NUEVO: Notificaciones Elegantes (Toastify)
// =============================
function notificar(mensaje, tipo = "exito") {
  // Colores: verde para éxito, rojo para error, naranja para advertencia
  let colorFondo = tipo === "exito" ? "#2ecc71" : tipo === "error" ? "#e74c3c" : "#f39c12";
  
  Toastify({
    text: mensaje,
    duration: 2500, // Desaparece en 2.5 segundos
    gravity: "bottom", // Sale en la parte de abajo
    position: "center",
    style: {
      background: colorFondo,
      borderRadius: "10px",
      fontWeight: "bold",
      fontSize: "15px",
      boxShadow: "0 4px 6px rgba(0,0,0,0.2)"
    }
  }).showToast();
}

// =============================
//  Cargar productos desde Firebase
// =============================
async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    generarVistaPrendas();
  } catch (error) {
    console.error("Error cargando prendas:", error);
    notificar("❌ Error cargando el inventario. Revisa tu internet.", "error");
  }
}

// =============================
//  Mostrar productos en la tienda
// =============================
function generarVistaPrendas() {
  const contenedor = document.getElementById("lista-prendas");
  contenedor.innerHTML = "";

  if (!Array.isArray(prendas) || prendas.length === 0) {
    contenedor.innerHTML = "<p>⚠️ No hay productos en el inventario.</p>";
    return;
  }

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
      btn.title = (t.stockTalla ?? 0) <= 0 ? "Sin stock" : `Stock: ${t.stockTalla}`;
      
      // Al hacer clic, muestra los botones de descuento
      btn.onclick = () => mostrarDescuentos(div, prenda, t);
      tallasDiv.appendChild(btn);
    });

    div.appendChild(tallasDiv);

    const descDiv = document.createElement("div");
    descDiv.className = "descuentos";
    div.appendChild(descDiv);

    contenedor.appendChild(div);
  });

  // Re-aplicar el filtro por si el usuario estaba buscando algo mientras agregó al carrito
  filtrarPrendas();
}

// =============================
//  NUEVO: Buscador en Vivo
// =============================
function filtrarPrendas() {
  const input = document.getElementById("buscador-prendas");
  if (!input) return; // Si no estamos en index.html, no hace nada
  
  const textoFiltro = input.value.toLowerCase();
  const tarjetas = document.querySelectorAll(".producto-card");

  tarjetas.forEach(tarjeta => {
    const nombrePrenda = tarjeta.querySelector("h3").innerText.toLowerCase();
    if (nombrePrenda.includes(textoFiltro)) {
      tarjeta.style.display = "flex"; // Lo muestra
    } else {
      tarjeta.style.display = "none"; // Lo oculta
    }
  });
}

// =============================
//  Descuentos
// =============================
function mostrarDescuentos(contenedor, prenda, tallaSel) {
  const descDiv = contenedor.querySelector(".descuentos");
  descDiv.innerHTML = "";

  const precioBase = (tallaSel.precio ?? prenda.precio);
  // Opciones de descuento: Precio normal, -S/1, -S/2, -S/3
  const descuentos = [0, 1, 2, 3];

  descuentos.forEach(desc => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = desc === 0 ? `S/${precioBase}` : `-S/${desc}`;
    btn.onclick = () => agregarProducto(prenda, tallaSel, Number(precioBase) - desc);
    descDiv.appendChild(btn);
  });
}

// =============================
//  Transacción: Ajustar stock en Firebase de forma segura
// =============================
async function ajustarStock(prendaId, tallaNumero, delta) {
  return db.runTransaction(async (tx) => {
    const ref = db.collection("inventario").doc(prendaId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Prenda no encontrada");

    const data = snap.data();
    const tallas = Array.isArray(data.tallas) ? [...data.tallas] : [];
    const idx = tallas.findIndex(x => Number(x.talla) === Number(tallaNumero));
    if (idx === -1) throw new Error("Talla no encontrada");

    const actual = Number(tallas[idx].stockTalla || 0) + delta;
    if (actual < 0) throw new Error("Sin stock para esta talla");

    tallas[idx].stockTalla = actual;
    const nuevoTotal = tallas.reduce((acc, x) => acc + Number(x.stockTalla || 0), 0);

    tx.update(ref, { tallas, stock: nuevoTotal });
    return { nuevoTotal, tallas };
  });
}

// =============================
//  Agregar al carrito (Optimizado)
// =============================
async function agregarProducto(prenda, tallaSel, precioFinal) {
  try {
    // Descontamos en Firebase
    const resultado = await ajustarStock(prenda.id, tallaSel.talla, -1);
    
    // Actualizamos localmente para no tener que recargar todo Firebase y ahorrar datos
    const idxPrenda = prendas.findIndex(p => p.id === prenda.id);
    if (idxPrenda !== -1) {
      prendas[idxPrenda].tallas = resultado.tallas;
      prendas[idxPrenda].stock = resultado.nuevoTotal;
    }

    // Usamos el objeto completo para que el reporte de tallas pueda hacer bien las mates
    productosSeleccionados.push({
      id: prenda.id,
      nombre: prenda.nombre,
      talla: Number(tallaSel.talla),
      precio: Number(precioFinal),
      texto: `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}`
    });
    total += Number(precioFinal);

    guardarCarrito();
    generarVistaPrendas(); 
    actualizarInterfaz();
    
    // Notificación elegante
    notificar(`🛒 ${prenda.nombre} T${tallaSel.talla} agregado`, "exito");

  } catch (error) {
    console.error("Error vendiendo:", error);
    notificar("⚠️ No se pudo agregar: " + error.message, "error");
  }
}

// =============================
//  Eliminar del carrito (Optimizado)
// =============================
async function eliminarProducto(index) {
  const prod = productosSeleccionados[index];
  if (!prod) return;
  try {
    // Reponemos el stock en Firebase
    const resultado = await ajustarStock(prod.id, prod.talla, +1);
    
    // Actualizamos localmente
    const idxPrenda = prendas.findIndex(p => p.id === prod.id);
    if (idxPrenda !== -1) {
      prendas[idxPrenda].tallas = resultado.tallas;
      prendas[idxPrenda].stock = resultado.nuevoTotal;
    }

    total -= Number(prod.precio);
    productosSeleccionados.splice(index, 1);

    guardarCarrito();
    generarVistaPrendas();
    actualizarInterfaz();
    
    notificar("🗑️ Producto retirado del carrito", "advertencia");

  } catch (error) {
    console.error("Error reponiendo stock:", error);
    notificar("⚠️ No se pudo devolver el stock: " + error.message, "error");
  }
}

// =============================
//  Guardar y cargar carrito en el celular
// =============================
function guardarCarrito() {
  try {
    localStorage.setItem("carrito", JSON.stringify({
      productos: productosSeleccionados,
      total
    }));
  } catch (e) {
    console.error("Error guardando carrito:", e);
  }
}

function cargarCarrito() {
  try {
    const data = localStorage.getItem("carrito");
    if (data) {
      const { productos, total: t } = JSON.parse(data);
      productosSeleccionados = Array.isArray(productos) ? productos : [];
      total = typeof t === "number" ? t : 0;
    }
  } catch (e) {
    console.error("Error cargando carrito, se limpiará:", e);
    localStorage.removeItem("carrito");
    productosSeleccionados = [];
    total = 0;
  }
}

// =============================
//  Vaciar carrito
// =============================
function reiniciarCarrito() {
  if (productosSeleccionados.length === 0) {
    notificar("El carrito ya está vacío", "advertencia");
    return;
  }
  if (!confirm("¿Seguro que deseas vaciar todo el carrito? Los productos no devuelven su stock automáticamente si haces esto.")) return;
  
  total = 0;
  productosSeleccionados = [];
  localStorage.removeItem("carrito");
  actualizarInterfaz();
  notificar("🔄 Carrito vaciado", "exito");
}

// =============================
//  Carrito / UI
// =============================
function actualizarInterfaz() {
  const totalDiv = document.getElementById("total");
  if(totalDiv) totalDiv.innerText = `Total: ${formatearSoles(total)}`;
  
  const ul = document.getElementById("productos");
  if(ul) {
    ul.innerHTML = "";
    productosSeleccionados.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span style="flex:1;">${p.texto}</span>
        <button style="background:#ff7675; border:none; color:white; border-radius:5px; padding:5px 10px; cursor:pointer;" onclick="eliminarProducto(${i})">❌</button>
      `;
      ul.appendChild(li);
    });
  }
}

// =============================
//  Finalizar venta
// =============================
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) {
    notificar("⚠️ ¡Agrega productos al carrito primero!", "advertencia");
    return;
  }
  
  const btn = document.querySelector(".btn-finalizar");
  btn.innerText = "⏳ Procesando...";
  btn.disabled = true;

  try {
    // Guardamos con fechaServidor para que el historial sea inquebrantable
    await db.collection("ventas").add({
      fechaServidor: firebase.firestore.FieldValue.serverTimestamp(),
      fechaTexto: new Date().toLocaleDateString("es-PE"),
      fecha: new Date().toLocaleDateString("es-PE"), // Guardamos ambas por compatibilidad
      hora: new Date().toLocaleTimeString("es-PE"),
      productos: productosSeleccionados, // Mandamos el objeto entero
      total: Number(total)
    });
    
    total = 0;
    productosSeleccionados = [];
    guardarCarrito();
    actualizarInterfaz();
    
    notificar("✅ ¡Venta registrada con éxito!", "exito");
    cargarHistorial(); // Actualiza el cuadrito de abajo

  } catch (err) {
    console.error("Error guardando venta:", err);
    notificar("❌ Ocurrió un error al registrar la venta.", "error");
  } finally {
    btn.innerText = "💰 FINALIZAR VENTA";
    btn.disabled = false;
  }
}

// =============================
//  Cargar Historial Rápido (Portada)
// =============================
async function cargarHistorial() {
  const ul = document.getElementById("ventasDia");
  if (!ul) return; // Si no está en el DOM, no hace nada

  try {
    const snapshot = await db.collection("ventas")
                             .orderBy("fechaServidor", "desc")
                             .limit(10) // Trae solo las 10 últimas para no saturar el celular
                             .get();
                             
    const historial = snapshot.docs.map(doc => doc.data());
    
    if (historial.length === 0) {
      ul.innerHTML = "<li style='text-align:center;'>Aún no hay ventas.</li>";
      return;
    }

    ul.innerHTML = historial.map(v => {
      // Extraer textos para resumir
      const resumenProductos = v.productos.map(p => typeof p === 'string' ? p : p.texto).join(" | ");
      return `
        <li>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📅 ${v.fechaTexto || v.fecha} - 🕒 ${v.hora}</div>
          <div style="font-weight: bold; color: #333;">${resumenProductos}</div>
          <div style="color: #27ae60; font-weight: bold; text-align: right; margin-top: 5px;">Total: ${formatearSoles(v.total)}</div>
        </li>
      `;
    }).join('');
  } catch (error) {
    console.error("Error cargando historial:", error);
  }
}

// =============================
//  Borrar Historial (Solo UI)
// =============================
function borrarHistorial() {
  const ul = document.getElementById("ventasDia");
  if(ul) ul.innerHTML = "<li style='text-align:center;'>Vista limpiada. (Las ventas siguen en la base de datos).</li>";
  notificar("Vista del historial limpiada", "exito");
}

// =============================
//  Inicializar Sistema
// =============================
window.onload = async () => {
  // Evitar que corra si estamos en la pantalla de login
  if(window.location.href.includes("login.html")) return;

  cargarCarrito();
  
  // Si estamos en la página principal, carga las prendas
  if(document.getElementById("lista-prendas")) {
    await cargarPrendas();
  }
  
  // Si tenemos el historial en pantalla, lo carga
  if(document.getElementById("ventasDia")) {
    await cargarHistorial();
  }
  
  actualizarInterfaz();
};
