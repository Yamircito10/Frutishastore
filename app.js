let total = 0;
let productosSeleccionados = [];
let prendas = [];

// ✅ Formato de moneda
const formatearSoles = (valor) => new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN"
}).format(valor);

// ✅ Función para generar tallas
function generarTallas(inicio, fin) {
  const tallas = [];
  for (let t = inicio; t <= fin; t += 2) {
    tallas.push({ talla: t, precio: null });
  }
  return tallas;
}

// ✅ Inventario inicial (con precios y tallas)
const prendasIniciales = [
  { nombre: 'Polos 1', precioBase: 35, tallas: generarTallas(4, 18), stock: 30 },
  { nombre: 'Polos 2', precioBase: 30, tallas: generarTallas(4, 16), stock: 25 },
  { nombre: 'Polos mangalarga niño', precioBase: 35, tallas: generarTallas(2, 16), stock: 20 },
  { nombre: 'Polos mangacorta niño', precioBase: 28, tallas: generarTallas(4, 16), stock: 15 },
  { nombre: 'Polo mangalarga algodón niña', precioBase: 30, tallas: generarTallas(4, 16), stock: 10 },
  { nombre: 'Jean 1', precioBase: 55, tallas: generarTallas(4, 14).concat([{ talla: 16, precio: 60 }]), stock: 18 },
  { nombre: 'Jean 2', precioBase: 60, tallas: generarTallas(4, 16), stock: 22 },
  { nombre: 'Jean 3', precioBase: 65, tallas: generarTallas(4, 16), stock: 12 },
  { nombre: 'Jean bebé', precioBase: 50, tallas: generarTallas(2, 8), stock: 9 },
  { nombre: 'Conjunto jean', precioBase: 130, tallas: generarTallas(4, 14).concat([{ talla: 16, precio: 135 }]), stock: 16 },
  { nombre: 'Conjunto de piedrita', precioBase: 70, tallas: generarTallas(4, 16), stock: 14 },
  { nombre: 'Casaca tíoe', precioBase: 75, tallas: generarTallas(4, 16), stock: 11 },
  { nombre: 'Conjunto flores', precioBase: 60, tallas: generarTallas(4, 16), stock: 10 },
  { nombre: 'Casaca impermeable', precioBase: 50, tallas: generarTallas(6, 14), stock: 12 },
  { nombre: 'Casaca cuero niño', precioBase: 60, tallas: generarTallas(4, 16), stock: 10 },
  { nombre: 'Casaca cuero niña', precioBase: 50, tallas: generarTallas(4, 14), stock: 9 },
  { nombre: 'Chaleco cuero niña', precioBase: 45, tallas: generarTallas(4, 16), stock: 13 },
  { nombre: 'Cafarena', precioBase: 10, tallas: generarTallas(4, 14), stock: 17 }
];

window.onload = () => {
  const usuario = localStorage.getItem("usuarioActivo");
  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  total = parseFloat(localStorage.getItem("total")) || 0;
  productosSeleccionados = JSON.parse(localStorage.getItem("productos")) || [];

  // ✅ Cargar inventario desde localStorage o inicial
  let inventarioGuardado = JSON.parse(localStorage.getItem("inventario"));

  if (inventarioGuardado && inventarioGuardado.length > 0) {
    // Mezclar datos guardados con tallas y precios originales
    prendas = prendasIniciales.map((item, i) => {
      let guardado = inventarioGuardado.find(p => p.nombre.startsWith(item.nombre.split("(")[0]));
      return {
        nombre: guardado ? guardado.nombre : item.nombre,
        precioBase: item.precioBase,
        tallas: item.tallas,
        stock: guardado && guardado.stock !== undefined ? guardado.stock : item.stock
      };
    });
  } else {
    prendas = prendasIniciales;
    localStorage.setItem("inventario", JSON.stringify(prendas));
  }

  generarVistaPrendas();
  actualizarInterfaz();
  mostrarHistorial(obtenerHistorial());
};

// ✅ Mostrar prendas en la tienda
function generarVistaPrendas() {
  const contenedor = document.getElementById("lista-prendas");
  contenedor.innerHTML = "";

  prendas.forEach((prenda) => {
    const div = document.createElement("div");
    div.className = "producto-card";

    const titulo = document.createElement("h3");
    titulo.innerText = `${prenda.nombre} (Stock: ${prenda.stock})`;
    div.appendChild(titulo);

    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";

    prenda.tallas.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "boton-talla";
      btn.innerText = `T${t.talla}`;
      btn.onclick = () => mostrarDescuentos(div, prenda, t);
      tallasDiv.appendChild(btn);
    });

    div.appendChild(tallasDiv);

    const descDiv = document.createElement("div");
    descDiv.className = "descuentos";
    div.appendChild(descDiv);

    contenedor.appendChild(div);
  });
}

// ✅ Mostrar botones de descuento
function mostrarDescuentos(contenedor, prenda, tallaSel) {
  const descDiv = contenedor.querySelector(".descuentos");
  descDiv.innerHTML = "";

  const precioBase = tallaSel.precio ?? prenda.precioBase;
  const descuentos = [0, 1, 2, 3];

  descuentos.forEach(d => {
    const btn = document.createElement("button");
    btn.className = "descuento-btn";
    btn.innerText = d === 0 ? "Sin Descuento" : `-S/${d}`;
    btn.onclick = () => agregarProducto(prenda, tallaSel, precioBase - d);
    descDiv.appendChild(btn);
  });
}

// ✅ Agregar producto al carrito
function agregarProducto(prenda, tallaSel, precioFinal) {
  if (prenda.stock <= 0) {
    alert("⚠️ No hay stock disponible para este producto");
    return;
  }

  total += precioFinal;
  productosSeleccionados.push(`${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}`);

  // Descontar 1 unidad del stock
  const index = prendas.findIndex(p => p.nombre === prenda.nombre);
  if (index !== -1) {
    prendas[index].stock -= 1;
    localStorage.setItem("inventario", JSON.stringify(prendas));
  }

  guardarEnLocalStorage();
  generarVistaPrendas();
  actualizarInterfaz();
}

// ✅ Actualizar carrito
function actualizarInterfaz() {
  document.getElementById("total").innerText = `Total: ${formatearSoles(total)}`;
  document.getElementById("productos").innerHTML = productosSeleccionados.map(p => `<li>${p}</li>`).join('');
}

function guardarEnLocalStorage() {
  localStorage.setItem("total", total);
  localStorage.setItem("productos", JSON.stringify(productosSeleccionados));
}

// ✅ Reiniciar carrito
function reiniciarCarrito() {
  if (!confirm("¿Estás seguro de reiniciar el carrito?")) return;
  total = 0;
  productosSeleccionados = [];
  localStorage.removeItem("total");
  localStorage.removeItem("productos");
  actualizarInterfaz();
}

// ✅ Finalizar venta
function finalizarVenta() {
  if (productosSeleccionados.length === 0) return alert("¡Agrega productos primero!");
  const historial = obtenerHistorial();
  const ahora = new Date();
  historial.push({
    fecha: ahora.toLocaleDateString("es-PE"),
    hora: ahora.toLocaleTimeString("es-PE"),
    productos: [...productosSeleccionados],
    total
  });
  localStorage.setItem("historialVentas", JSON.stringify(historial));
  total = 0;
  productosSeleccionados = [];
  localStorage.removeItem("total");
  localStorage.removeItem("productos");
  actualizarInterfaz();
  mostrarHistorial(historial);
  alert("✅ Venta guardada correctamente.");
}

// ✅ Historial
function obtenerHistorial() {
  return JSON.parse(localStorage.getItem("historialVentas")) || [];
}

function mostrarHistorial(historial) {
  document.getElementById("ventasDia").innerHTML = historial.map((venta) => `
    <li>
      🗓️ ${venta.fecha} 🕒 ${venta.hora}<br>
      🧾 <strong>${venta.productos.length} productos</strong> - 💵 Total: <strong>${formatearSoles(venta.total)}</strong>
    </li>`).join('');
}

// ✅ Borrar historial
function borrarHistorial() {
  if (!confirm("¿Estás seguro de borrar el historial?")) return;
  localStorage.removeItem("historialVentas");
  mostrarHistorial([]);
  alert("🗑 Historial eliminado correctamente.");
}

// ✅ Descargar PDF
function descargarPDF() {
  const historial = obtenerHistorial();
  if (historial.length === 0) return alert("⚠️ No hay ventas para exportar.");

  let contenido = `🛍️ Historial de Ventas - Tienda Perú\n\n`;
  historial.forEach((venta, i) => {
    contenido += `Venta ${i + 1}\nFecha: ${venta.fecha} - Hora: ${venta.hora}\nProductos:\n`;
    venta.productos.forEach(p => contenido += `  - ${p}\n`);
    contenido += `Total: ${formatearSoles(venta.total)}\n---------------------------\n`;
  });

  const elemento = document.createElement("pre");
  elemento.textContent = contenido;

  html2pdf().set({
    margin: 10,
    filename: `ventas_peru_${new Date().toLocaleDateString("es-PE")}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 1 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(elemento).save();
}