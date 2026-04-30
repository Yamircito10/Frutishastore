async function cargarPrendas() {
  try {
    const snapshot = await db.collection("inventario").get();
    prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    generarVistaPrendas();
  } catch (error) { notificar("❌ Error inventario.", "error"); }
}

function generarVistaPrendas() {
  const contenedor = document.getElementById("lista-prendas");
  if(!contenedor) return;
  contenedor.innerHTML = "";
  if (prendas.length === 0) return contenedor.innerHTML = "<p>⚠️ Vacío.</p>";
  prendas.forEach(prenda => {
    const div = document.createElement("div");
    div.className = "producto-card";
    div.setAttribute("data-categoria", prenda.categoria || "Unisex"); 
    const carruselContenedor = document.createElement("div");
    carruselContenedor.style.position = "relative"; 
    const carrusel = document.createElement("div");
    carrusel.className = "carrusel-fotos";
    let arrayFotos = prenda.imagenes && prenda.imagenes.length > 0 ? prenda.imagenes : (prenda.imagen ? [prenda.imagen] : ["https://via.placeholder.com/150x140?text=Sin+Foto"]);
    arrayFotos.forEach(urlFoto => {
        const img = document.createElement("img");
        img.src = urlFoto; img.alt = prenda.nombre; carrusel.appendChild(img);
    });
    carruselContenedor.appendChild(carrusel);
    if (arrayFotos.length > 1) {
        const btnIzq = document.createElement("button");
        btnIzq.innerHTML = "❮";
        btnIzq.style = "position:absolute; left:5px; top:40%; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:35px; height:35px; font-size:18px; color:var(--principal); z-index:10;";
        btnIzq.onclick = () => carrusel.scrollBy({ left: -200, behavior: 'smooth' });
        const btnDer = document.createElement("button");
        btnDer.innerHTML = "❯";
        btnDer.style = "position:absolute; right:5px; top:40%; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:35px; height:35px; font-size:18px; color:var(--principal); z-index:10;";
        btnDer.onclick = () => carrusel.scrollBy({ left: 200, behavior: 'smooth' });
        carruselContenedor.appendChild(btnIzq); carruselContenedor.appendChild(btnDer);
    }
    div.appendChild(carruselContenedor);
    const titulo = document.createElement("h3");
    titulo.innerText = `${prenda.nombre} (Stock: ${prenda.stock ?? 0})`;
    div.appendChild(titulo);
    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";
    const tallas = Array.isArray(prenda.tallas) ? prenda.tallas : [];
    tallas.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "boton-talla";
      const stock = t.stockTalla ?? 0;
      btn.innerText = `T${t.talla}`; 
      btn.disabled = stock <= 0;
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

function setCategoria(cat, btnElement) {
  categoriaActual = cat;
  document.querySelectorAll('.btn-cat').forEach(btn => btn.classList.remove('activa'));
  if(btnElement) btnElement.classList.add('activa');
  filtrarPrendas();
}

function filtrarPrendas() {
  const input = document.getElementById("buscador-prendas");
  if (!input) return;
  const textoFiltro = input.value.toLowerCase();
  document.querySelectorAll("#lista-prendas .producto-card").forEach(tarjeta => {
    const titulo = tarjeta.querySelector("h3").innerText.toLowerCase();
    const catPrenda = tarjeta.getAttribute("data-categoria");
    tarjeta.style.display = (titulo.includes(textoFiltro) && (categoriaActual === "Todas" || catPrenda === categoriaActual)) ? "flex" : "none";
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

async function agregarProducto(prenda, tallaSel, precioFinal) {
  try {
    const res = await ajustarStock(prenda.id, tallaSel.talla, -1);
    productosSeleccionados.push({ id: prenda.id, nombre: prenda.nombre, talla: tallaSel.talla, precio: Number(precioFinal), texto: `${prenda.nombre} T${tallaSel.talla} - ${formatearSoles(precioFinal)}` });
    recalcularTotal(); guardarCarrito(); generarVistaPrendas(); actualizarInterfaz();
    notificar(`🛒 Agregado`, "exito");
  } catch (error) { notificar("⚠️ Sin stock", "error"); }
}

async function eliminarProducto(index) {
  const prod = productosSeleccionados[index];
  try {
    await ajustarStock(prod.id, prod.talla, +1);
    productosSeleccionados.splice(index, 1);
    recalcularTotal(); guardarCarrito(); generarVistaPrendas(); actualizarInterfaz();
  } catch (e) {}
}

function actualizarInterfaz() {
  const totalDiv = document.getElementById("total");
  if(totalDiv) totalDiv.innerText = `Total: ${formatearSoles(total)}`;
  const ul = document.getElementById("productos");
  if(ul) {
    ul.innerHTML = "";
    productosSeleccionados.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span style="flex:1;">${p.texto}</span><button onclick="eliminarProducto(${i})">❌</button>`;
      ul.appendChild(li);
    });
  }
}

function guardarCarrito() { localStorage.setItem("carrito", JSON.stringify({ productos: productosSeleccionados, total })); }
function cargarCarrito() {
  const data = localStorage.getItem("carrito");
  if (data) { const p = JSON.parse(data); productosSeleccionados = p.productos || []; recalcularTotal(); }
}
function reiniciarCarrito() {
  if (!confirm("¿Vaciar?")) return;
  productosSeleccionados = []; recalcularTotal(); localStorage.removeItem("carrito"); actualizarInterfaz();
}
