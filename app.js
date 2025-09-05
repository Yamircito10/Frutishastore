// =============================
//  Frutisha Store - Firebase
// =============================

// ✅ Variables globales
let total = 0;
let productosSeleccionados = []; // {id, talla, precio, texto}
let prendas = [];

// ✅ Formatear soles
const formatearSoles = (valor) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

// =============================
//  Guardar y cargar carrito
// =============================
function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify({
    productos: productosSeleccionados,
    total: total
  }));
}

function cargarCarrito() {
  const data = localStorage.getItem("carrito");
  if (data) {
    try {
      const { productos, total: t } = JSON.parse(data);
      productosSeleccionados = Array.isArray(productos) ? productos : [];
      total = typeof t === "number" ? t : 0;
    } catch (e) {
      console.error("Error cargando carrito:", e);
      productosSeleccionados = [];
      total = 0;
    }
  }
}

// =============================
//  Cargar productos
// =============================
async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    generarVistaPrendas();
  } catch (error) {
    console.error("Error cargando prendas:", error);
  }
}

// ... (el resto del código original se mantiene igual)

// =============================
//  Agregar al carrito (vende 1 unidad)
// =============================
async function agregarProducto(prenda, tallaSel, precioFinal) {
  try {
    await ajustarStock(prenda.id, tallaSel.talla, -1);

    const texto = `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}`;
    productosSeleccionados.push({
      id: prenda.id,
      talla: Number(tallaSel.talla),
      precio: Number(precioFinal),
      texto
    });
    total += Number(precioFinal);

    guardarCarrito(); // <<-- NUEVO
    await cargarPrendas();
    actualizarInterfaz();
  } catch (error) {
    console.error("Error vendiendo:", error);
    alert("⚠️ No se pudo realizar la venta: " + error.message);
  }
}

// =============================
//  Eliminar del carrito
// =============================
async function eliminarProducto(index) {
  const prod = productosSeleccionados[index];
  if (!prod) return;
  try {
    await ajustarStock(prod.id, prod.talla, +1);

    total -= Number(prod.precio);
    productosSeleccionados.splice(index, 1);

    guardarCarrito(); // <<-- NUEVO
    await cargarPrendas();
    actualizarInterfaz();
  } catch (error) {
    console.error("Error reponiendo stock:", error);
    alert("⚠️ No se pudo reponer el stock: " + error.message);
  }
}

// =============================
//  Finalizar venta
// =============================
async function finalizarVenta() {
  if (productosSeleccionados.length === 0) return alert("¡Agrega productos primero!");
  const ahora = new Date();
  try {
    await db.collection("ventas").add({
      fecha: ahora.toLocaleDateString("es-PE"),
      hora: ahora.toLocaleTimeString("es-PE"),
      productos: productosSeleccionados.map(p => p.texto),
      total: Number(total)
    });
    total = 0;
    productosSeleccionados = [];
    localStorage.removeItem("carrito"); // <<-- BORRA AL FINALIZAR
    actualizarInterfaz();
    alert("✅ Venta guardada correctamente.");
    cargarHistorial();
  } catch (err) {
    console.error("Error guardando venta:", err);
    alert("❌ Error guardando venta.");
  }
}

// =============================
//  Reiniciar carrito
// =============================
function reiniciarCarrito() {
  if (!confirm("¿Deseas reiniciar el carrito?")) return;
  total = 0;
  productosSeleccionados = [];
  localStorage.removeItem("carrito"); // <<-- BORRA AL REINICIAR
  actualizarInterfaz();
}

// =============================
//  Inicializar
// =============================
window.onload = async () => {
  const usuario = localStorage.getItem("usuarioActivo");
  if (!usuario) {
    window.location.href = "login.html";
    return;
  }
  cargarCarrito(); // <<-- NUEVO: CARGA EL CARRITO GUARDADO
  await cargarPrendas();
  await cargarHistorial();
  actualizarInterfaz();
};