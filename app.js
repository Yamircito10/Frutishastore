// app.js

// Variables globales
let carrito = [];
let total = 0;

// Referencia a Firestore (usando la exportación global de firebase.js)
const prendasRef = db.collection("prendas");
const ventasRef = db.collection("ventas");

// Elementos del DOM
const listaPrendas = document.getElementById("listaPrendas");
const carritoUl = document.getElementById("carrito");
const totalSpan = document.getElementById("total");

// Cargar productos desde Firestore
function cargarPrendas() {
  listaPrendas.innerHTML = "Cargando productos...";
  
  prendasRef.get()
    .then(snapshot => {
      if (snapshot.empty) {
        listaPrendas.innerHTML = "<p>No hay productos disponibles.</p>";
        return;
      }

      listaPrendas.innerHTML = "";
      snapshot.forEach(doc => {
        const prenda = doc.data();
        const div = document.createElement("div");
        div.classList.add("prenda-item");
        div.innerHTML = `
          <h3>${prenda.nombre}</h3>
          <p>Precio: S/ ${prenda.precio}</p>
          <button onclick="agregarAlCarrito('${doc.id}', '${prenda.nombre}', ${prenda.precio})">Agregar</button>
        `;
        listaPrendas.appendChild(div);
      });
    })
    .catch(error => {
      console.error("Error cargando productos:", error);
      listaPrendas.innerHTML = "<p>Error al cargar los productos.</p>";
    });
}

// Agregar al carrito
function agregarAlCarrito(id, nombre, precio) {
  carrito.push({ id, nombre, precio });
  total += precio;
  actualizarCarrito();
}

// Eliminar del carrito
function eliminarDelCarrito(index) {
  total -= carrito[index].precio;
  carrito.splice(index, 1);
  actualizarCarrito();
}

// Actualizar carrito en pantalla
function actualizarCarrito() {
  carritoUl.innerHTML = "";
  carrito.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${item.nombre} - S/ ${item.precio}
      <button onclick="eliminarDelCarrito(${index})">X</button>
    `;
    carritoUl.appendChild(li);
  });
  totalSpan.textContent = `S/ ${total.toFixed(2)}`;
}

// Finalizar venta
function finalizarVenta() {
  if (carrito.length === 0) {
    alert("El carrito está vacío.");
    return;
  }

  const venta = {
    productos: carrito,
    total: total,
    fecha: new Date().toISOString()
  };

  ventasRef.add(venta)
    .then(() => {
      alert("Venta registrada con éxito.");
      carrito = [];
      total = 0;
      actualizarCarrito();
    })
    .catch(error => {
      console.error("Error registrando la venta:", error);
      alert("Ocurrió un error al registrar la venta.");
    });
}

// Cargar productos al iniciar
cargarPrendas();