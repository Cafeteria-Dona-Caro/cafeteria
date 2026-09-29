// Volver a la página que falló (solo nombres de archivo del propio sitio)
const volver = new URLSearchParams(location.search).get("volver") || "";
if (/^[a-z-]+\.html(\?[\w=&%.-]*)?$/.test(volver)) {
  document.getElementById("reintentar").href = volver;
}
