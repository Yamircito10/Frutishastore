// ===============================
// Datos iniciales de productos
// ===============================
const productos = [
  { id: 1, nombre: "Polera Fruitsha", precio: 50, tallas: ["S", "M", "L"] },
  { id: 2, nombre: "Polo Fruitsha", precio: 30, tallas: ["S", "M", "L", "XL"] },
  { id: 3, nombre: "Casaca Fruitsha", precio: 90, tallas: ["M", "L"] }
];

let carrito = [];
let historial = JSON.parse(localStorage.getItem("historialVentas")) || [];

// ===============================
// Renderizar productos
// ===============================
function mostrarProductos() {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = "";

  productos.forEach(prod => {
    const card = document.createElement("div");
    card.classList.add("producto-card");

    card.innerHTML = `
      <h3>${prod.nombre}</h3>
      <p>Precio: S/ ${prod.precio.toFixed(2)}</p>
      <label for="talla-${prod.id}">Talla:</label>
      <select id="talla-${prod.id}">
        ${prod.tallas.map(t => `<option value="${t}">${t}</option>`).join("")}
      </select>
      <button onclick="agregarAlCarrito(${prod.id})">Agregar al carrito</button>
    `;

    contenedor.appendChild(card);
  });
}

// ===============================
// Carrito
// ===============================
function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  const talla = document.getElementById(`talla-${id}`).value;

  carrito.push({ ...producto, talla });
  actualizarCarrito();
}

function actualizarCarrito() {
  const lista = document.getElementById("lista-carrito");
  lista.innerHTML = "";

  carrito.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${item.nombre} - Talla ${item.talla} - S/ ${item.precio}`;
    lista.appendChild(li);
  });

  const total = carrito.reduce((acc, p) => acc + p.precio, 0);
  document.getElementById("total").textContent = `Total: S/ ${total.toFixed(2)}`;
}

document.getElementById("finalizar").addEventListener("click", () => {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  historial.push({
    fecha: new Date().toLocaleString(),
    items: [...carrito]
  });

  localStorage.setItem("historialVentas", JSON.stringify(historial));
  carrito = [];
  actualizarCarrito();
  alert("Venta finalizada ✅");
});

document.getElementById("reiniciar").addEventListener("click", () => {
  carrito = [];
  actualizarCarrito();
});

document.getElementById("borrarHistorial").addEventListener("click", () => {
  if (confirm("¿Seguro que quieres borrar el historial?")) {
    historial = [];
    localStorage.removeItem("historialVentas");
    document.getElementById("contenedor-reportes").innerHTML = "";
  }
});

document.getElementById("descargarTXT").addEventListener("click", () => {
  if (historial.length === 0) {
    alert("No hay historial para descargar");
    return;
  }

  let contenido = "Historial de Ventas:\n\n";
  historial.forEach((venta, i) => {
    contenido += `Venta ${i + 1} - ${venta.fecha}\n`;
    venta.items.forEach(item => {
      contenido += ` - ${item.nombre} (Talla: ${item.talla}) - S/ ${item.precio}\n`;
    });
    contenido += "\n";
  });

  const blob = new Blob([contenido], { type: "text/plain" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "historial_ventas.txt";
  enlace.click();
});

// ===============================
// Reportes
// ===============================
document.getElementById("verHistorial").addEventListener("click", () => {
  const contenedor = document.getElementById("contenedor-reportes");
  contenedor.innerHTML = "<h3>Historial de Ventas</h3>";

  historial.forEach((venta, i) => {
    const div = document.createElement("div");
    div.classList.add("reporte-card");
    div.innerHTML = `
      <strong>Venta ${i + 1} - ${venta.fecha}</strong>
      <ul>
        ${venta.items.map(it => `<li>${it.nombre} - Talla ${it.talla} - S/ ${it.precio}</li>`).join("")}
      </ul>
    `;
    contenedor.appendChild(div);
  });
});

document.getElementById("verInventario").addEventListener("click", () => {
  const contenedor = document.getElementById("contenedor-reportes");
  contenedor.innerHTML = "<h3>Inventario</h3>";

  productos.forEach(p => {
    const div = document.createElement("div");
    div.classList.add("reporte-card");
    div.innerHTML = `
      ${p.nombre} - Precio: S/ ${p.precio} <br>
      Tallas: ${p.tallas.join(", ")}
    `;
    contenedor.appendChild(div);
  });
});

document.getElementById("verTallas").addEventListener("click", () => {
  const contenedor = document.getElementById("contenedor-reportes");
  contenedor.innerHTML = "<h3>Reporte de Tallas Vendidas</h3>";

  const conteo = {};

  historial.forEach(v => {
    v.items.forEach(item => {
      conteo[item.talla] = (conteo[item.talla] || 0) + 1;
    });
  });

  for (const [talla, cantidad] of Object.entries(conteo)) {
    const p = document.createElement("p");
    p.textContent = `Talla ${talla}: ${cantidad} ventas`;
    contenedor.appendChild(p);
  }
});

// ===============================
// Inicialización
// ===============================
mostrarProductos();
actualizarCarrito();