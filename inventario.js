<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <title>✨ LUDAVA - Tienda Virtual</title>
  
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#ff7eb3">
  <link rel="apple-touch-icon" href="icono-192.png">
  
  <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&family=Montserrat:wght@600&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
  <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/toastify-js"></script>

  <style>
    /* 🎨 VARIABLES DINÁMICAS */
    :root {
      --fuente-principal: 'Poppins', sans-serif;
      --borde-tarjeta: 0px;
      --sombra-tarjeta: 0 4px 15px rgba(0,0,0,0.1);
      --radio-tarjeta: 15px;
      --color-wa: #25D366;
      --nav-bg: var(--tarjetas);
      --nav-texto: var(--texto);
      --nav-activo: var(--principal);
      --nav-bg-activo: var(--fondo);
      --radio-btn: 10px;
      --fondo-modal: var(--tarjetas);
      --filtro-cristal: none;
    }
    
    body { font-family: var(--fuente-principal) !important; padding-bottom: 90px !important; transition: background 0.3s; }
    
    /* 🚨 CSS CLAVE PARA LOS MODALES (No lo borres) */
    .modal-oculto { display: none; }
    .modal-activo { 
      display: flex !important; 
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.6); z-index: 2000; 
      justify-content: center; align-items: center; 
    }
    .modal-contenido { width: 90%; max-width: 400px; padding: 25px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }

    /* DISEÑO DE TARJETAS */
    .producto-card { border-radius: var(--radio-tarjeta) !important; box-shadow: var(--sombra-tarjeta) !important; border: var(--borde-tarjeta) !important; padding: 15px; margin-bottom: 15px; background: var(--tarjetas); }

    .nav-inferior { position: fixed; bottom: 0; left: 0; width: 100%; background-color: var(--nav-bg) !important; backdrop-filter: var(--filtro-cristal); -webkit-backdrop-filter: var(--filtro-cristal); box-shadow: 0 -4px 15px rgba(0,0,0,0.1); display: flex; justify-content: flex-start; align-items: center; padding: 10px 5px 15px 5px; z-index: 1000; overflow-x: auto; white-space: nowrap; border-radius: 20px 20px 0 0; }
    .nav-inferior button { background: transparent; color: var(--nav-texto) !important; border: none; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; padding: 5px 12px; min-width: 70px; transition: all 0.3s ease; font-family: inherit; }
    .nav-inferior button .icono-nav { font-size: 22px; margin-bottom: 4px; }
    .nav-inferior button:hover, .nav-inferior button:active { color: var(--nav-activo) !important; background-color: var(--nav-bg-activo) !important; }
    
    .productos.grid-view { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .whatsapp-flotante { bottom: 100px !important; background-color: var(--color-wa) !important; }
  </style>
</head>
<body>

<header class="header-container">
  <div style="display: flex; align-items: center; gap: 10px;">
    <img id="logo-tienda" src="" alt="Logo" style="display: none; height: 40px; border-radius: 8px; object-fit: contain;">
    <h1 id="titulo-tienda">✨ LUDAVA</h1>
  </div>
  <button id="btn-tema" class="btn-tema" onclick="toggleTema()">🌙</button>
</header>

<nav class="nav-inferior">
  <button onclick="navegarSPA('vista-tienda')"><span class="icono-nav">🏠</span><span>Tienda</span></button>
  <button class="admin-only" style="display:none;" onclick="navegarSPA('vista-ventas')"><span class="icono-nav">📈</span><span>Ventas</span></button>
  <button class="admin-only" style="display:none;" onclick="navegarSPA('vista-clientes')"><span class="icono-nav">👥</span><span>Clientes</span></button>
  <button class="admin-only" style="display:none;" onclick="navegarSPA('vista-historial')"><span class="icono-nav">📚</span><span>Historial</span></button>
  <button class="admin-only" style="display:none;" onclick="navegarSPA('vista-tallas')"><span class="icono-nav">📊</span><span>Tallas</span></button>
  <button class="admin-only" style="display:none;" onclick="navegarSPA('vista-gastos')"><span class="icono-nav">💸</span><span>Gastos</span></button>
  <button class="admin-only" style="display:none;" onclick="navegarSPA('vista-inventario')"><span class="icono-nav">📦</span><span>Almacén</span></button>
  <button class="admin-only" style="display:none; color: var(--principal);" onclick="abrirModalDiseno()"><span class="icono-nav">🎨</span><span>Diseño</span></button>
  <button id="btn-login" onclick="window.location.href='login.html'"><span class="icono-nav">🔒</span><span>Ingresar</span></button>
  <button id="btn-salir" class="admin-only" style="display:none; color:#e74c3c;" onclick="cerrarSesion()"><span class="icono-nav">🚪</span><span>Salir</span></button>
</nav>

<div id="vista-tienda" class="pantalla pantalla-activa">
  <section id="lista-prendas" class="productos"><p>Cargando...</p></section>
  <div id="total">Total: S/ 0.00</div>
  <div class="acciones">
    <button class="btn-finalizar" onclick="finalizarVenta()">Enviar Pedido 🚀</button>
  </div>
</div>

<div id="vista-inventario" class="pantalla">
  <h2>📦 Almacén Central</h2>
  <div class="producto-card">
    <h3>➕ Nueva Prenda</h3>
    <input type="text" id="nuevo-nombre" placeholder="Nombre">
    <input type="number" id="nuevo-precio" placeholder="Precio">
    <select id="nuevo-categoria" style="width:100%; padding:10px; margin:10px 0;"><option value="Niñas">Niñas 🎀</option><option value="Niños">Niños 🧢</option><option value="Bebés">Bebés 🍼</option></select>
    <input type="text" id="nuevas-tallas" placeholder="S, M, L">
    <input type="file" id="nueva-imagen-file" multiple>
    <button onclick="guardarNuevaPrenda()" style="width:100%; background:var(--exito); color:white; padding:12px; border:none; margin-top:10px; font-weight:bold; border-radius:10px;">💾 Guardar en Inventario</button>
  </div>
  <div id="admin-inventario"></div>
  <h3 style="margin-top:30px;">🕵️ Historial de Movimientos</h3>
  <div id="historial-movimientos" style="max-height: 300px; overflow-y: auto; background: var(--tarjetas); padding: 10px; border-radius:10px;"></div>
</div>

<div id="vista-ventas" class="pantalla"><h2>📈 Reporte de Ventas</h2><div id="kpis-ventas"></div></div>
<div id="vista-historial" class="pantalla"><h2>📚 Historial de Recibos</h2><ul id="ventasDia"></ul></div>

<div id="modal-editar" class="modal-oculto">
  <div class="modal-contenido form-inventario">
    <h3 style="color:var(--principal)">✏️ Editar Prenda</h3>
    <input type="text" id="edit-nombre">
    <input type="number" id="edit-precio">
    <select id="edit-categoria"><option value="Niñas">Niñas</option><option value="Niños">Niños</option><option value="Bebés">Bebés</option></select>
    <p style="font-size:12px; margin-top:10px;">Cambiar Fotos:</p>
    <input type="file" id="edit-imagen-file" multiple>
    <div style="display:flex; gap:10px; margin-top:20px;">
      <button onclick="cerrarModalEditar()" style="flex:1; background:#95a5a6; color:white; border:none; padding:12px; border-radius:10px;">❌ Cancelar</button>
      <button id="btn-guardar-edicion" onclick="guardarEdicionInfo()" style="flex:1; background:var(--exito); color:white; border:none; padding:12px; border-radius:10px; font-weight:bold;">💾 Guardar</button>
    </div>
  </div>
</div>

<div id="modal-stock" class="modal-oculto">
  <div class="modal-contenido">
    <h3 id="modal-stock-titulo">Cargar Stock</h3>
    <div id="modal-paso-tallas">
      <div id="modal-tallas-botones" class="botones-grid"></div>
      <button onclick="cerrarModalStock()" style="margin-top:20px; width:100%; padding:12px; background:#95a5a6; color:white; border:none; border-radius:10px;">❌ Cancelar</button>
    </div>
    <div id="modal-paso-teclado" style="display:none;">
      <div class="pantalla-teclado" id="pantalla-cantidad" style="background:var(--fondo); padding:15px; font-size:24px; text-align:center; border-radius:10px; margin-bottom:15px;">0</div>
      <div class="teclado-numerico" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
        <button onclick="teclear(1)">1</button><button onclick="teclear(2)">2</button><button onclick="teclear(3)">3</button>
        <button onclick="teclear(4)">4</button><button onclick="teclear(5)">5</button><button onclick="teclear(6)">6</button>
        <button onclick="teclear(7)">7</button><button onclick="teclear(8)">8</button><button onclick="teclear(9)">9</button>
        <button onclick="teclear('C')" style="background:#e74c3c; color:white;">C</button><button onclick="teclear(0)">0</button>
        <button id="btn-confirmar-teclado" onclick="confirmarStockTeclado()" style="background:var(--exito); color:white;">✔</button>
      </div>
    </div>
  </div>
</div>

<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
<script>
  const firebaseConfig = {
    apiKey: "AIzaSyBtNWOs53cdTm0SYUZe_qCQb4OC-_VdcMQ",
    authDomain: "frutisha-store.firebaseapp.com",
    projectId: "inventario-ab270",
    storageBucket: "frutisha-store.appspot.com",
    messagingSenderId: "15388676345",
    appId: "1:15388676345:web:72c8e22a2aece1d4151228"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>

<script src="core.js"></script>
<script src="diseno.js"></script>
<script src="tienda.js"></script>
<script src="ventas.js"></script>
<script src="inventario.js"></script>

<script>
  const usuario = localStorage.getItem("usuarioActivo");
  const rol = localStorage.getItem("rolActivo");
  if (rol === "admin") {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = "flex");
      document.getElementById("btn-login").style.display = "none";
  }
  function cerrarSesion() { if(confirm("¿Salir?")) { localStorage.clear(); window.location.href = "index.html"; } }
  function toggleTema() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("temaFrutisha", document.body.classList.contains("dark-mode") ? "oscuro" : "claro");
    if (typeof cargarConfiguracion === "function") cargarConfiguracion();
  }
</script>
</body>
</html>
