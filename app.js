// =============================
// Manejo de datos
// =============================

// Cargar historial de ventas desde localStorage
let historialVentas = JSON.parse(localStorage.getItem("historialVentas")) || [];

// Carrito actual
let carrito = [];

// =============================
// Funciones principales
// =============================

// Mostrar una sección y ocultar las demás
function mostrarSeccion(idSeccion) {
    document.querySelectorAll('.seccion').forEach(sec => {
        sec.style.display = "none";
    });
    document.getElementById(idSeccion).style.display = "block";
}

// Agregar producto al carrito
function agregarProducto() {
    const nombre = document.getElementById("nombreProducto").value;
    const precio = parseFloat(document.getElementById("precioProducto").value);
    const cantidad = parseInt(document.getElementById("cantidadProducto").value);

    if (!nombre || isNaN(precio) || isNaN(cantidad)) {
        alert("Por favor completa todos los campos.");
        return;
    }

    const producto = { nombre, precio, cantidad };
    carrito.push(producto);

    actualizarCarrito();
}

// Actualizar carrito en pantalla
function actualizarCarrito() {
    const lista = document.getElementById("listaCarrito");
    lista.innerHTML = "";

    let total = 0;
    carrito.forEach((p, index) => {
        const li = document.createElement("li");
        li.textContent = `${p.nombre} - S/.${p.precio} x ${p.cantidad}`;
        lista.appendChild(li);
        total += p.precio * p.cantidad;
    });

    document.getElementById("totalCarrito").textContent = `Total: S/.${total.toFixed(2)}`;
}

// Finalizar venta
function finalizarVenta() {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    historialVentas.push({
        fecha: new Date().toLocaleString(),
        productos: [...carrito]
    });

    localStorage.setItem("historialVentas", JSON.stringify(historialVentas));
    carrito = [];
    actualizarCarrito();
    alert("Venta finalizada y guardada.");
}

// Reiniciar carrito
function reiniciarCarrito() {
    carrito = [];
    actualizarCarrito();
}

// Borrar historial
function borrarHistorial() {
    if (confirm("¿Seguro que deseas borrar todo el historial?")) {
        historialVentas = [];
        localStorage.removeItem("historialVentas");
        mostrarHistorial();
    }
}

// =============================
// Reportes
// =============================

// Mostrar historial
function mostrarHistorial() {
    mostrarSeccion("historial");

    const contenedor = document.getElementById("contenedorHistorial");
    contenedor.innerHTML = "";

    historialVentas.forEach((venta, index) => {
        const div = document.createElement("div");
        div.classList.add("venta");
        div.innerHTML = `<h3>Venta ${index + 1} - ${venta.fecha}</h3>`;
        venta.productos.forEach(p => {
            div.innerHTML += `<p>${p.nombre} - S/.${p.precio} x ${p.cantidad}</p>`;
        });
        contenedor.appendChild(div);
    });
}

// Mostrar inventario (productos vendidos acumulados)
function mostrarInventario() {
    mostrarSeccion("inventario");

    const inventario = {};

    historialVentas.forEach(venta => {
        venta.productos.forEach(p => {
            if (!inventario[p.nombre]) {
                inventario[p.nombre] = 0;
            }
            inventario[p.nombre] += p.cantidad;
        });
    });

    const contenedor = document.getElementById("contenedorInventario");
    contenedor.innerHTML = "";

    for (let [nombre, cantidad] of Object.entries(inventario)) {
        const p = document.createElement("p");
        p.textContent = `${nombre}: ${cantidad} unidades`;
        contenedor.appendChild(p);
    }
}

// Mostrar reporte de tallas
function mostrarReporteTallas() {
    mostrarSeccion("reporteTallas");

    const tallas = {};

    historialVentas.forEach(venta => {
        venta.productos.forEach(p => {
            // Detectar tallas en el nombre (ejemplo: "Polo M")
            const match = p.nombre.match(/\b(XS|S|M|L|XL|XXL)\b/i);
            if (match) {
                const talla = match[0].toUpperCase();
                if (!tallas[talla]) tallas[talla] = 0;
                tallas[talla] += p.cantidad;
            }
        });
    });

    const contenedor = document.getElementById("contenedorTallas");
    contenedor.innerHTML = "";

    for (let [talla, cantidad] of Object.entries(tallas)) {
        const p = document.createElement("p");
        p.textContent = `${talla}: ${cantidad} unidades`;
        contenedor.appendChild(p);
    }
}

// =============================
// Exportar datos
// =============================

// Descargar historial en TXT
function descargarHistorial() {
    let contenido = "HISTORIAL DE VENTAS\n\n";

    historialVentas.forEach((venta, index) => {
        contenido += `Venta ${index + 1} - ${venta.fecha}\n`;
        venta.productos.forEach(p => {
            contenido += `   ${p.nombre} - S/.${p.precio} x ${p.cantidad}\n`;
        });
        contenido += "\n";
    });

    const blob = new Blob([contenido], { type: "text/plain" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = "historial_ventas.txt";
    enlace.click();
}