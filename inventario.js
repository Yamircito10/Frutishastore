async function ajustarStock(prendaId, tallaNumero, delta) {
  return db.runTransaction(async (tx) => {
    const ref = db.collection("inventario").doc(prendaId);
    const snap = await tx.get(ref);
    const data = snap.data();
    const tallas = [...data.tallas];
    const idx = tallas.findIndex(x => String(x.talla) === String(tallaNumero));
    tallas[idx].stockTalla = Number(tallas[idx].stockTalla) + delta;
    const nuevoTotal = tallas.reduce((acc, x) => acc + Number(x.stockTalla), 0);
    tx.update(ref, { tallas, stock: nuevoTotal });
    registrarMovimiento(data.nombre, tallaNumero, Math.abs(delta), delta > 0 ? "suma" : "resta");
    return { nuevoTotal, tallas };
  });
}

// COPIAR AQUÍ: cargarInventarioSPA, guardarNuevaPrenda, eliminarPrendaAdmin
// COPIAR AQUÍ: abrirEdicionInfo, cerrarModalEditar, guardarEdicionInfo
// COPIAR AQUÍ: abrirEdicionStock, seleccionarTallaTeclado, teclear, cerrarModalStock, confirmarStockTeclado
// COPIAR AQUÍ: registrarMovimiento, cargarHistorialMovimientosSPA
