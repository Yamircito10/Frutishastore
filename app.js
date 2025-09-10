// app.js unificado con módulos de cada página

// === Código movido de historial.html ===
function initHistorial() {
function formatearSoles(valor) {
      return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);
    }

    let historialVentas = [];

    async function cargarHistorial() {
      const lista = document.getElementById("listaHistorial");
      lista.innerHTML = "<li>Cargando...</li>";
      try {
        const snap = await db.collection("ventas").orderBy("fecha", "desc").get();
        historialVentas = snap.docs.map(d => d.data());

        if (historialVentas.length === 0) {
          lista.innerHTML = "<li>No hay ventas registradas aún.</li>";
          return;
        }

        lista.innerHTML = historialVentas.map((venta, i) => `
          <li>
            <strong>${venta.fecha}</strong> — 🕒 ${venta.hora}<br>
            ${venta.productos.map(p => `🔹 ${p}`).join("<br>")}
            <br>💵 Total: <strong>${formatearSoles(venta.total)}</strong>
          </li>
        `).join("");
      } catch (e) {
        console.error(e);
        lista.innerHTML = "<li>❌ Error al cargar historial.</li>";
      }
    }

    function descargarTxt() {
      if (historialVentas.length === 0) {
        alert("⚠️ No hay datos para exportar.");
        return;
      }

      let contenido = "🛍️ Historial General de Ventas - Frutisha Store\n\n";
      historialVentas.forEach((venta, i) => {
        contenido += `Venta ${i + 1} - ${venta.fecha} ${venta.hora}\n`;
        venta.productos.forEach(p => contenido += `  - ${p}\n`);
        contenido += `Total: ${formatearSoles(venta.total)}\n-------------------------\n`;
      });

      const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `historial_completo.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    window.onload = cargarHistorial;
}

// === Código movido de inventario.html ===
function initInventario() {
const usuario = localStorage.getItem("usuarioActivo");
  const rol = localStorage.getItem("rolActivo");
  if (!usuario || rol !== "admin") {
    alert("❌ Acceso denegado. Solo administradores.");
    window.location.href = "index.html";
  }




  let prendasInv = [];

  function agregarFilaTalla(contenedorId, data={talla:"", precio:"", stockTalla:""}) {
    const cont = document.getElementById(contenedorId);
    const row = document.createElement("div");
    row.className = "talla-row";
    row.innerHTML = `
      <input type="number" step="1" placeholder="Talla" value="${data.talla}" />
      <input type="number" step="0.01" placeholder="Precio" value="${data.precio}" />
      <input type="number" step="1" placeholder="Stock talla" value="${data.stockTalla}" />
      <button class="btn-mini btn-del" onclick="this.parentElement.remove()">🗑</button>
    `;
    cont.appendChild(row);
  }

  function leerTallasDeContenedor(contenedorId){
    const cont = document.getElementById(contenedorId);
    const filas = [...cont.querySelectorAll(".talla-row")];
    const tallas = [];
    let total = 0;
    filas.forEach(f=>{
      const [tallaInp, precioInp, stockInp] = f.querySelectorAll("input");
      const talla = Number(tallaInp.value);
      const precio = precioInp.value === "" ? null : Number(precioInp.value);
      const stockTalla = Number(stockInp.value||0);
      if(!isNaN(talla)){
        tallas.push({talla, precio, stockTalla});
        total += stockTalla;
      }
    });
    return { tallas, total };
  }

  async function cargarInventario(){
    const snap = await db.collection("inventario").get();
    prendasInv = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderInventario();
  }

  function renderInventario(){
    const cont = document.getElementById("contenedor-inventario");
    cont.innerHTML = "";
    if(prendasInv.length===0){
      cont.innerHTML = "<p>⚠️ No hay productos.</p>";
      return;
    }
    prendasInv.forEach((p,idx)=>{
      const card = document.createElement("div");
      card.className = "producto-item";
      const contTallasId = `tallas-${idx}`;
      card.innerHTML = `
        <h3>${p.nombre}</h3>
        <input type="text" id="nombre-${idx}" value="${p.nombre}" placeholder="Nombre"/>
        <input type="number" id="precio-${idx}" value="${p.precio ?? ''}" placeholder="Precio base (opcional)"/>
        <input type="number" id="stock-${idx}" value="${p.stock ?? 0}" placeholder="Stock total" disabled />

        <div class="tallas-box" id="${contTallasId}">
          <div class="mini">Tallas (talla / precio / stockTalla)</div>
        </div>
        <button class="btn-mini btn-add" onclick="agregarFilaTalla('${contTallasId}')">➕ Añadir talla</button>

        <div style="margin-top:8px;">
          <button class="guardar-btn" onclick="guardarUno(${idx})">💾 Guardar</button>
          <button class="guardar-btn" style="background:#dc3545" onclick="eliminarPrenda('${p.id}')">🗑 Eliminar</button>
        </div>
      `;
      cont.appendChild(card);
      // rellenar tallas
      const t = Array.isArray(p.tallas) ? p.tallas : [];
      t.forEach(tt=>agregarFilaTalla(contTallasId, tt));
    });
  }

  async function guardarUno(idx){
    const p = prendasInv[idx];
    const nombre = document.getElementById(`nombre-${idx}`).value.trim();
    const precioBaseRaw = document.getElementById(`precio-${idx}`).value;
    const precio = precioBaseRaw === "" ? null : Number(precioBaseRaw);
    const {tallas, total} = leerTallasDeContenedor(`tallas-${idx}`);

    await db.collection("inventario").doc(p.id).update({
      nombre,
      precio,
      stock: total,
      tallas
    });
    alert("✅ Guardado.");
    cargarInventario();
  }

  async function guardarTodos(){
    for(let i=0;i<prendasInv.length;i++){
      await guardarUno(i);
    }
  }

  async function agregarPrenda(){
    const nombre = document.getElementById("nuevo-nombre").value.trim();
    const precioBaseRaw = document.getElementById("nuevo-precio").value;
    const precio = precioBaseRaw === "" ? null : Number(precioBaseRaw);
    const {tallas, total} = leerTallasDeContenedor("nuevo-tallas");
    if(!nombre){ alert("Ingresa nombre"); return; }
    if(tallas.length===0){ alert("Agrega al menos una talla"); return; }

    await db.collection("inventario").add({
      nombre,
      precio,
      stock: total,
      tallas
    });

    document.getElementById("nuevo-nombre").value = "";
    document.getElementById("nuevo-precio").value = "";
    document.getElementById("nuevo-tallas").innerHTML = `<div class="mini">Tallas (talla / precio / stockTalla)</div>`;
    alert("✅ Prenda agregada.");
    cargarInventario();
  }

  async function eliminarPrenda(id){
    if(!confirm("¿Eliminar prenda?")) return;
    await db.collection("inventario").doc(id).delete();
    alert("🗑 Eliminado.");
    cargarInventario();
  }

  // Inicial
  // agrega una fila por defecto en "nuevo" para comodidad
  document.addEventListener("DOMContentLoaded", ()=>{
    agregarFilaTalla("nuevo-tallas");
    cargarInventario();
  });
}

// === Código movido de reporte.html ===
function initReporte() {
// Requiere sesión
  const usuario = localStorage.getItem("usuarioActivo");
  if (!usuario) { window.location.href = "login.html"; }




  // Utilidades
  const formatearSoles = v => new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(v||0);

  function parseFechaEs(fechaStr) {
    // Espera "DD/MM/YYYY"
    if (!fechaStr) return null;
    const [d,m,y] = fechaStr.split('/').map(x=>parseInt(x,10));
    if(!d||!m||!y) return null;
    return new Date(y, m-1, d);
  }

  // Extrae: nombre, talla (número) y precio (number) desde "Nombre T16 - S/ 35.00"
  function parseLineaProducto(linea) {
    if (!linea || typeof linea !== 'string') return null;
    // Busca el último " - " para separar precio
    const sep = linea.lastIndexOf(' - ');
    if (sep === -1) return null;
    const left = linea.slice(0, sep).trim();   // "Nombre T16"
    const right = linea.slice(sep + 3).trim(); // "S/ 35.00"

    // Talla: último 'T' seguido de números
    const mTalla = left.match(/T\s*(\d+)/i);
    const talla = mTalla ? parseInt(mTalla[1],10) : null;

    // Nombre: lo que esté antes del " T"
    const nombre = mTalla ? left.slice(0, mTalla.index).trim() : left;

    // Precio: quitar S/ y comas
    const num = right.replace(/[^\d.,-]/g,'').replace(/\./g,'').replace(',', '.');
    const precio = parseFloat(num);
    return { nombre, talla, precio: isNaN(precio)?0:precio };
  }

  let cacheVentas = []; // guardamos últimas ventas cargadas (ya filtradas)

  async function cargarReporte() {
    // 1) Traer ventas
    const snap = await db.collection("ventas").get();
    const ventas = snap.docs.map(d => d.data());

    // 2) Filtro por fecha (client-side porque guardaste fecha como string)
    const d1 = document.getElementById('desde').value ? new Date(document.getElementById('desde').value) : null;
    const d2 = document.getElementById('hasta').value ? new Date(document.getElementById('hasta').value) : null;

    const filtradas = ventas.filter(v => {
      const fv = parseFechaEs(v.fecha);
      if (!fv) return true; // si no se puede parsear, incluimos
      if (d1 && fv < d1) return false;
      if (d2) {
        // incluir todo el día hasta 23:59:59
        const limite = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), 23,59,59);
        if (fv > limite) return false;
      }
      return true;
    });

    cacheVentas = filtradas;

    // 3) Agregado
    const aggTalla = new Map();        // talla -> unidades
    const aggPrendaTalla = new Map();  // "prenda|talla" -> {unidades, ingresos}
    const aggPrenda = new Map();       // prenda -> {unidades, ingresos}
    let totalUnidades = 0;
    let totalIngresos = 0;

    filtradas.forEach(v => {
      const arr = Array.isArray(v.productos) ? v.productos : [];
      arr.forEach(linea => {
        const p = parseLineaProducto(linea);
        if (!p) return;

        // Unidades (cada línea = 1 und)
        totalUnidades += 1;

        // Ingresos (sumamos precio de la línea)
        totalIngresos += (p.precio || 0);

        // Por talla (global)
        if (p.talla != null) {
          aggTalla.set(p.talla, (aggTalla.get(p.talla) || 0) + 1);
        }

        // Por prenda y talla
        const keyPT = `${p.nombre}|${p.talla ?? '-'}`;
        const curPT = aggPrendaTalla.get(keyPT) || { unidades:0, ingresos:0 };
        curPT.unidades += 1;
        curPT.ingresos += (p.precio || 0);
        aggPrendaTalla.set(keyPT, curPT);

        // Totales por prenda
        const curP = aggPrenda.get(p.nombre) || { unidades:0, ingresos:0 };
        curP.unidades += 1;
        curP.ingresos += (p.precio || 0);
        aggPrenda.set(p.nombre, curP);
      });
    });

    // 4) Render KPIs
    document.getElementById('kpi-unidades').textContent = String(totalUnidades);
    document.getElementById('kpi-ingresos').textContent = formatearSoles(totalIngresos);

    // 5) Render tablas
    renderTablaTallas(aggTalla);
    renderTablaPrendaTalla(aggPrendaTalla, aggPrenda);
  }

  function renderTablaTallas(aggTalla) {
    const tbody = document.querySelector('#tabla-tallas tbody');
    tbody.innerHTML = '';
    // ordenar por talla (num asc)
    const filas = [...aggTalla.entries()].sort((a,b)=>a[0]-b[0]);
    filas.forEach(([talla, unidades]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>T${talla}</td><td>${unidades}</td>`;
      tbody.appendChild(tr);
    });
    if (filas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2">Sin datos en el rango seleccionado.</td></tr>`;
    }
  }

  function renderTablaPrendaTalla(aggPT, aggP) {
    const tbody = document.querySelector('#tabla-prenda-talla tbody');
    const tfoot = document.getElementById('tfoot-prenda');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    // ordenar por prenda y talla
    const filas = [...aggPT.entries()].sort((a,b)=>{
      const [pa,ta] = a[0].split('|');
      const [pb,tb] = b[0].split('|');
      if (pa.toLowerCase() < pb.toLowerCase()) return -1;
      if (pa.toLowerCase() > pb.toLowerCase()) return 1;
      return (parseInt(ta,10)||0) - (parseInt(tb,10)||0);
    });

    let prendaActual = null;
    filas.forEach(([key, val]) => {
      const [prenda, talla] = key.split('|');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prenda}</td>
        <td>${talla === '-' ? '—' : 'T'+talla}</td>
        <td>${val.unidades}</td>
        <td>${formatearSoles(val.ingresos)}</td>
      `;
      tbody.appendChild(tr);
      prendaActual = prenda;
    });

    // Totales por prenda (pie simple)
    const totales = [...aggP.entries()].sort((a,b)=>{
      return a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1;
    });
    if (totales.length) {
      const trHead = document.createElement('tr');
      trHead.innerHTML = `<td colspan="4" style="font-weight:700; padding-top:10px;">Totales por prenda</td>`;
      tfoot.appendChild(trHead);

      totales.forEach(([prenda, v]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight:600;">${prenda}</td>
          <td>—</td>
          <td style="font-weight:600;">${v.unidades}</td>
          <td style="font-weight:600;">${formatearSoles(v.ingresos)}</td>
        `;
        tfoot.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="4">Sin datos en el rango seleccionado.</td></tr>`;
    }
  }

  function exportarCSV() {
    // A partir de cacheVentas (rango ya aplicado), generamos un CSV detalle por línea.
    if (!cacheVentas.length) {
      alert("⚠️ No hay datos para exportar.");
      return;
    }
    let filas = [["Fecha","Hora","Prenda","Talla","Precio"]];

    cacheVentas.forEach(v => {
      const arr = Array.isArray(v.productos) ? v.productos : [];
      arr.forEach(linea => {
        const p = parseLineaProducto(linea);
        if (!p) return;
        filas.push([v.fecha, v.hora, p.nombre, p.talla ?? "", (p.precio||0).toString().replace('.',',')]);
      });
    });

    const csv = filas.map(r => r.map(c=>{
      const s = String(c ?? "");
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(";")).join("\n");

    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_tallas_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  // Carga inicial
  cargarReporte();
}

// === Código movido de ventas.html ===
function initVentas() {
function formatearSoles(valor) {
      return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor);
    }

    let ventasFiltradas = [];

    async function buscarPorFecha() {
      const fecha = document.getElementById("fechaSeleccionada").value;
      if (!fecha) return alert("⚠️ Selecciona una fecha válida");

      const lista = document.getElementById("listaVentas");
      lista.innerHTML = "<li>Cargando...</li>";

      const fechaPE = new Date(fecha).toLocaleDateString("es-PE");
      try {
        const snap = await db.collection("ventas").where("fecha", "==", fechaPE).get();
        ventasFiltradas = snap.docs.map(d => d.data());

        if (ventasFiltradas.length === 0) {
          lista.innerHTML = "<li>No hay ventas para esta fecha.</li>";
          return;
        }

        lista.innerHTML = ventasFiltradas.map((venta, i) => `
          <li>
            <strong>Venta ${i + 1}</strong> — 🕒 ${venta.hora}<br>
            ${venta.productos.map(p => `🔹 ${p}`).join("<br>")}
            <br>💵 Total: <strong>${formatearSoles(venta.total)}</strong>
          </li>
        `).join("");
      } catch (e) {
        console.error(e);
        lista.innerHTML = "<li>❌ Error al cargar ventas.</li>";
      }
    }

    function descargarTxt() {
      if (ventasFiltradas.length === 0) {
        alert("⚠️ No hay ventas para exportar.");
        return;
      }
      const fecha = document.getElementById("fechaSeleccionada").value || new Date().toISOString().slice(0,10);

      let contenido = "🛍️ Ventas del Día - Frutisha Store\n\n";
      ventasFiltradas.forEach((venta, i) => {
        contenido += `Venta ${i + 1} - ${venta.hora}\n`;
        venta.productos.forEach(p => contenido += `  - ${p}\n`);
        contenido += `Total: ${formatearSoles(venta.total)}\n-------------------------\n`;
      });

      const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ventas_${fecha}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
}

