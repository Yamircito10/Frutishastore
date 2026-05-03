// ==========================================
// LUDAVA STORE - DISEÑO (diseno.js)
// ==========================================

let configActual = {};

async function cargarConfiguracion() {
  try {
      const doc = await db.collection("configuracion").doc("tienda").get();
      if(doc.exists) {
          configActual = doc.data();
          
          if(configActual.titulo) {
              document.title = configActual.titulo + " - Tienda Virtual";
              const titulo = document.getElementById("titulo-tienda");
              if (titulo) titulo.innerText = configActual.titulo;
          }
          if(configActual.logoUrl) {
              const imgLogo = document.getElementById("logo-tienda");
              const titulo = document.getElementById("titulo-tienda");
              if (imgLogo && titulo) {
                  imgLogo.src = configActual.logoUrl;
                  imgLogo.style.display = "block";
                  titulo.style.display = "none";
              }
          } else {
              const imgLogo = document.getElementById("logo-tienda");
              const titulo = document.getElementById("titulo-tienda");
              if (imgLogo && titulo) { imgLogo.style.display = "none"; titulo.style.display = "block"; }
          }

          if(configActual.colorPrincipal) document.documentElement.style.setProperty('--principal', configActual.colorPrincipal);
          if(configActual.colorWhatsApp) document.documentElement.style.setProperty('--color-wa', configActual.colorWhatsApp);
          
          if(configActual.tipografia) document.documentElement.style.setProperty('--fuente-principal', configActual.tipografia);

          if(configActual.estiloTarjetas === "plano") {
              document.documentElement.style.setProperty('--radio-tarjeta', '0px');
              document.documentElement.style.setProperty('--sombra-tarjeta', 'none');
              document.documentElement.style.setProperty('--borde-tarjeta', '1px solid var(--borde)');
          } else {
              document.documentElement.style.setProperty('--radio-tarjeta', '15px');
              document.documentElement.style.setProperty('--sombra-tarjeta', '0 4px 6px rgba(0,0,0,0.05)');
              document.documentElement.style.setProperty('--borde-tarjeta', '0px');
          }

          const banner = document.getElementById("contenedor-banner");
          const textoBanner = document.getElementById("texto-banner");
          if(configActual.mensajeAnuncio && banner && textoBanner) {
              textoBanner.innerText = configActual.mensajeAnuncio;
              banner.style.display = "block";
          } else if (banner) {
              banner.style.display = "none";
          }

          const listaPrendas = document.getElementById("lista-prendas");
          if(listaPrendas) {
              if (configActual.layoutCatalogo === "cuadricula") {
                  listaPrendas.classList.add("grid-view");
              } else {
                  listaPrendas.classList.remove("grid-view");
              }
          }

          if (configActual.colorNav === "principal") {
              document.documentElement.style.setProperty('--nav-bg', 'var(--principal)');
              document.documentElement.style.setProperty('--nav-texto', 'rgba(255,255,255,0.8)');
              document.documentElement.style.setProperty('--nav-activo', '#ffffff');
              document.documentElement.style.setProperty('--nav-bg-activo', 'rgba(0,0,0,0.1)');
          } else {
              document.documentElement.style.setProperty('--nav-bg', 'var(--tarjetas)');
              document.documentElement.style.setProperty('--nav-texto', 'var(--texto)');
              document.documentElement.style.setProperty('--nav-activo', 'var(--principal)');
              document.documentElement.style.setProperty('--nav-bg-activo', 'var(--fondo)');
          }

          if (configActual.estiloBotones === "cuadrado") {
              document.documentElement.style.setProperty('--radio-btn', '4px');
          } else if (configActual.estiloBotones === "pildora") {
              document.documentElement.style.setProperty('--radio-btn', '30px');
          } else {
              document.documentElement.style.setProperty('--radio-btn', '10px');
          }

          if (configActual.efectoCristal === "activado") {
              document.documentElement.style.setProperty('--filtro-cristal', 'blur(12px)');
              if (document.body.classList.contains("dark-mode")) {
                   document.documentElement.style.setProperty('--fondo-modal', 'rgba(30, 30, 30, 0.75)');
                   if(configActual.colorNav !== "principal") document.documentElement.style.setProperty('--nav-bg', 'rgba(30, 30, 30, 0.75)');
              } else {
                   document.documentElement.style.setProperty('--fondo-modal', 'rgba(255, 255, 255, 0.75)');
                   if(configActual.colorNav !== "principal") document.documentElement.style.setProperty('--nav-bg', 'rgba(255, 255, 255, 0.75)');
              }
          } else {
              document.documentElement.style.setProperty('--filtro-cristal', 'none');
              document.documentElement.style.setProperty('--fondo-modal', 'var(--tarjetas)');
          }
      }
  } catch(e) { console.log("No hay diseño personalizado aún."); }
}

function abrirModalDiseno() {
  document.getElementById("config-titulo").value = configActual.titulo || "✨ LUDAVA";
  document.getElementById("config-color").value = configActual.colorPrincipal || "#d81b60";
  document.getElementById("config-wa").value = configActual.colorWhatsApp || "#25D366";
  document.getElementById("config-fuente").value = configActual.tipografia || "'Poppins', sans-serif";
  document.getElementById("config-banner").value = configActual.mensajeAnuncio || "";
  document.getElementById("config-tarjetas").value = configActual.estiloTarjetas || "redondeado";
  
  document.getElementById("config-layout").value = configActual.layoutCatalogo || "lista";
  document.getElementById("config-colornav").value = configActual.colorNav || "blanco";
  document.getElementById("config-botones").value = configActual.estiloBotones || "redondeado";
  document.getElementById("config-cristal").value = configActual.efectoCristal || "desactivado";
  
  document.getElementById("config-logo-file").value = ""; 
  document.getElementById("modal-diseno").classList.add("modal-activo");
}

function cerrarModalDiseno() {
  document.getElementById("modal-diseno").classList.remove("modal-activo");
}

async function guardarDiseno() {
  const nuevoTitulo = document.getElementById("config-titulo").value.trim();
  const nuevoColor = document.getElementById("config-color").value;
  const nuevoWa = document.getElementById("config-wa").value;
  const nuevaFuente = document.getElementById("config-fuente").value;
  const nuevoAnuncio = document.getElementById("config-banner").value.trim();
  const nuevoEstilo = document.getElementById("config-tarjetas").value;
  
  const nuevoLayout = document.getElementById("config-layout").value;
  const nuevoColorNav = document.getElementById("config-colornav").value;
  const nuevoBotones = document.getElementById("config-botones").value;
  const nuevoCristal = document.getElementById("config-cristal").value;
  
  const archivoLogo = document.getElementById("config-logo-file").files[0];

  if(!nuevoTitulo) return notificar("⚠️ El nombre no puede estar vacío", "advertencia");

  const btnGuardar = document.getElementById("btn-guardar-diseno");
  btnGuardar.innerText = "⏳ Guardando..."; btnGuardar.disabled = true;

  try {
      let logoFinal = configActual.logoUrl || "";

      if (archivoLogo) {
          notificar("📸 Subiendo logo a la nube...", "exito");
          const formData = new FormData();
          formData.append("image", archivoLogo);
          const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
          const data = await response.json();
          if (data.success) logoFinal = data.data.url;
      }

      await db.collection("configuracion").doc("tienda").set({
          titulo: nuevoTitulo,
          colorPrincipal: nuevoColor,
          colorWhatsApp: nuevoWa,
          tipografia: nuevaFuente,
          mensajeAnuncio: nuevoAnuncio,
          estiloTarjetas: nuevoEstilo,
          layoutCatalogo: nuevoLayout,
          colorNav: nuevoColorNav,
          estiloBotones: nuevoBotones,
          efectoCristal: nuevoCristal,
          logoUrl: logoFinal
      }, { merge: true });

      notificar("🎨 Diseño aplicado con éxito", "exito");
      cerrarModalDiseno();
      await cargarConfiguracion(); 
  } catch(e) {
      notificar("❌ Error al guardar diseño", "error");
  } finally {
      btnGuardar.innerText = "💾 Aplicar Cambios"; btnGuardar.disabled = false;
  }
}
