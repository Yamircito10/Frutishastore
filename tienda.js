// ==========================================
// LUDAVA STORE - TIENDA (tienda.js)
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
    div.setAttribute("data-categoria", prenda.categoria || "Unisex"); 
    
    const carruselContenedor = document.createElement("div");
    carruselContenedor.style.position = "relative"; 

    const carrusel = document.createElement("div");
    carrusel.className = "carrusel-fotos";
    
    let arrayFotos = prenda.imagenes && prenda.imagenes.length > 0 ? prenda.imagenes : (prenda.imagen ? [prenda.imagen] : ["https://via.placeholder.com/150x140?text=Sin+Foto"]);
    
    arrayFotos.forEach(urlFoto => {
        const img = document.createElement("img");
        img.src = urlFoto;
        img.alt = prenda.nombre;
        carrusel.appendChild(img);
    });
    
    carruselContenedor.appendChild(carrusel);

    if (arrayFotos.length > 1) {
        const btnIzq = document.createElement("button");
        btnIzq.innerHTML = "❮";
        btnIzq.style = "position:absolute; left:5px; top:40%; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:35px; height:35px; font-size:18px; font-weight:bold; color:var(--principal); cursor:pointer; z-index:10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
        btnIzq.onclick = () => carrusel.scrollBy({ left: -200, behavior: 'smooth' });

        const btnDer = document.createElement("button");
        btnDer.innerHTML = "❯";
        btnDer.style = "position:absolute; right:5px; top:40%; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:35px; height:35px; font-size:18px; font-weight:bold; color:var(--principal); cursor:pointer; z-index:10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
        btnDer.onclick = () => carrusel.scrollBy({ left: 200, behavior: 'smooth' });

        const badge = document.createElement("div");
        badge.innerHTML = `📸 ${arrayFotos.length} fotos`;
        badge.style = "position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; pointer-events: none;";

        carruselContenedor.appendChild(btnIzq);
        carruselContenedor.appendChild(btnDer);
        carruselContenedor.appendChild(badge);
    }

    div.appendChild(carruselContenedor);

    const titulo = document.createElement("h3");
    titulo.innerText = `${prenda.nombre} (Total: ${prenda.stock ?? 0})`;
    div.appendChild(titulo);
    
    const tallasDiv = document.createElement("div");
    tallasDiv.className = "tallas";

    const tallas = Array.isArray(prenda.tallas) ? prenda.tallas : [];
    tallas.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "boton-talla";
      const stock = t.stockTalla ?? 0;
      btn.innerText = `T${t.talla}`; 
      if (stock > 0 && stock <= 3) btn.classList.add("stock-bajo");
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
    const h3 = tarjeta.querySelector("h3");
    if (!h3) return; 
    const titulo = h3.innerText.toLowerCase();
    const catPrenda = tarjeta.getAttribute("data-categoria");
    const coincideTexto = titulo.includes(textoFiltro);
    const coincideCat = (categoriaActual === "Todas" || catPrenda === categoriaActual);
    tarjeta.style.display = (coincideTexto && coincideCat) ? "flex" : "none";
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
  productosSeleccionados = []; recalcularTotal(); localStorage.removeItem("carrito"); actualizarInterfaz(); notificar("🔄 Carrito vaciado", "exito");
}
