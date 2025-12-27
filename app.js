const soles = (n)=> new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(Number(n||0));

function requireSession(){
  const u = localStorage.getItem("usuarioActivo");
  if(!u){ location.href="login.html"; return null; }
  return u;
}
function logout(){
  localStorage.removeItem("usuarioActivo");
  location.href="login.html";
}

async function fetchInventario(){
  const snap = await db.collection("inventario").get();
  return snap.docs.map(d=>({id:d.id, ...d.data()}));
}
async function upsertItem(id, data){
  if(id){ await db.collection("inventario").doc(id).set(data,{merge:true}); return id; }
  const ref = await db.collection("inventario").add(data);
  return ref.id;
}
async function deleteItem(id){
  await db.collection("inventario").doc(id).delete();
}

function activeNav(){
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(a=>{
    const href = (a.getAttribute("href")||"").toLowerCase();
    if(href === page) a.classList.add("active");
  });
}

window.addEventListener("DOMContentLoaded", async ()=>{
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if(page !== "login.html") requireSession();

  const btnSalir = document.getElementById("btnSalir");
  if(btnSalir) btnSalir.onclick = logout;
  activeNav();

  // Dashboard
  if(page === "index.html"){
    const all = await fetchInventario();

    document.getElementById("kpiProductos").textContent = String(all.length);
    document.getElementById("kpiBajo").textContent = String(all.filter(x=>Number(x.stock||0)<=5).length);
    document.getElementById("kpiCritico").textContent = String(all.filter(x=>Number(x.stock||0)<=2).length);

    const items = all.sort((a,b)=>Number(a.stock||0)-Number(b.stock||0)).slice(0,10);
    const tb = document.getElementById("tablaResumen");
    tb.innerHTML = items.map(x=>`
      <tr>
        <td>${x.nombre||"-"}</td>
        <td>${x.categoria||"-"}</td>
        <td>${x.talla||"-"}</td>
        <td>${soles(x.precio||0)}</td>
        <td>${Number(x.stock||0)}</td>
      </tr>
    `).join("") || `<tr><td colspan="5">Sin productos.</td></tr>`;
  }

  // Inventario
  if(page === "inventario.html"){
    let editingId = null;
    const $ = (id)=> document.getElementById(id);

    async function load(){
      const all = await fetchInventario();
      const q = ($("qInv").value||"").toLowerCase();
      const items = all.filter(x=>{
        if(!q) return true;
        const t = `${x.nombre||""} ${x.categoria||""} ${x.sku||""} ${x.talla||""}`.toLowerCase();
        return t.includes(q);
      }).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));

      const tb = $("tablaInventario");
      tb.innerHTML = items.map(x=>`
        <tr>
          <td>${x.nombre||"-"}</td>
          <td>${x.categoria||"-"}</td>
          <td>${x.talla||"-"}</td>
          <td>${soles(x.precio||0)}</td>
          <td>${Number(x.stock||0)}</td>
          <td style="display:flex;gap:8px;align-items:center">
            <button class="btn small" data-edit="${x.id}">Editar</button>
            <button class="btn small danger" data-del="${x.id}">Eliminar</button>
          </td>
        </tr>
      `).join("") || `<tr><td colspan="6">Sin productos.</td></tr>`;

      tb.querySelectorAll("[data-edit]").forEach(b=> b.onclick = ()=>{
        const id=b.dataset.edit;
        const x = all.find(i=>i.id===id);
        if(!x) return;
        editingId=id;
        $("nombre").value=x.nombre||"";
        $("categoria").value=x.categoria||"";
        $("precio").value=x.precio??"";
        $("talla").value=x.talla||"M";
        $("stock").value=x.stock??"";
        $("sku").value=x.sku||"";
      });

      tb.querySelectorAll("[data-del]").forEach(b=> b.onclick = async ()=>{
        if(!confirm("¿Eliminar este producto?")) return;
        await deleteItem(b.dataset.del);
        await load();
      });
    }

    $("qInv").oninput = ()=> load();

    $("btnLimpiar").onclick = ()=>{
      editingId=null;
      ["nombre","categoria","precio","stock","sku"].forEach(k=>$(k).value="");
      $("talla").value="M";
    };

    $("btnGuardar").onclick = async ()=>{
      const data = {
        nombre: $("nombre").value.trim(),
        categoria: $("categoria").value.trim(),
        precio: Number($("precio").value||0),
        talla: $("talla").value,
        stock: Number($("stock").value||0),
        sku: $("sku").value.trim()
      };
      if(!data.nombre || !data.categoria){ alert("Completa nombre y categoría"); return; }
      editingId = await upsertItem(editingId, data);
      await load();
    };

    await load();
  }
});
