// ==========================================
// LUDAVA STORE - CORE & GLOBALS (core.js)
// ==========================================

let total = 0;
let productosSeleccionados = [];
let prendas = [];
let categoriaActual = "Todas"; 
let ventasHistorialCache = []; 

// 🔑 LLAVE SECRETA DE IMGBB 
const IMGBB_API_KEY = "5d117755ac501feb4dfb28b62d2a41bb";

const formatearSoles = (valor) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);

function notificar(mensaje, tipo = "exito") {
  let colorFondo = tipo === "exito" ? "#2ecc71" : tipo === "error" ? "#e74c3c" : "#f39c12";
  Toastify({ text: mensaje, duration: 2500, gravity: "bottom", position: "center", style: { background: colorFondo, borderRadius: "10px", fontWeight: "bold", fontSize: "15px", boxShadow: "0 4px 6px rgba(0,0,0,0.2)" } }).showToast();
}

function recalcularTotal() {
  total = productosSeleccionados.reduce((suma, prod) => suma + Number(prod.precio), 0);
}

window.navegarSPA = function(idDestino) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('pantalla-activa'));
  document.getElementById(idDestino).classList.add('pantalla-activa');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (idDestino === 'vista-historial') cargarHistorialSPA();
  if (idDestino === 'vista-ventas') cargarReporteVentasSPA();
  if (idDestino === 'vista-tallas') cargarReporteTallasSPA();
  if (idDestino === 'vista-gastos') cargarGastosSPA();
  if (idDestino === 'vista-clientes') cargarClientesSPA();
  if (idDestino === 'vista-inventario') { cargarInventarioSPA(); cargarHistorialMovimientosSPA(); }
};

window.onload = async () => { 
  if(window.location.href.includes("login.html")) return; 
  await cargarConfiguracion(); 
  cargarCarrito(); 
  await cargarPrendas(); 
  actualizarInterfaz(); 
};
