/**
 * SEEDER DEL MENÚ — CAFÉ DE CARO (proyecto cafecaro-af23b)
 * Carga data/menu-inicial.json en branches/{SUCURSAL_ID}/products.
 *
 * Es seguro ejecutarlo varias veces: cada producto usa un ID fijo
 * (categoría + nombre), así que se actualiza en lugar de duplicarse.
 *
 * Normalmente NO hace falta: el administrador puede importar el menú desde
 * admin.html → Productos → "Importar menú inicial".
 *
 * Uso (desde tu computadora, nunca en el servidor):
 *   1. Firebase Console → Configuración → Cuentas de servicio → Generar clave privada.
 *   2. Guarda el archivo FUERA del repositorio, p. ej. ~/claves/cafecaro.json
 *   3. GOOGLE_APPLICATION_CREDENTIALS=~/claves/cafecaro.json npm run seed
 *   4. Cuando termines, revoca la clave en Google Cloud Console → IAM → Cuentas de servicio.
 */

const admin = require("firebase-admin");
const path = require("path");

const SUCURSAL_ID = "cafecaro-centro";
const productos = require(path.join(__dirname, "..", "data", "menu-inicial.json"));

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "\n❌ Falta la variable GOOGLE_APPLICATION_CREDENTIALS con la ruta a la clave de servicio.\n" +
    "   Ejemplo: GOOGLE_APPLICATION_CREDENTIALS=~/claves/cafecaro.json npm run seed\n"
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "cafecaro-af23b",
});

const db = admin.firestore();

// Mismo algoritmo que slugify() en js/utils.js
function slugify(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedMenu() {
  console.log(`\n🌿 Cargando menú en branches/${SUCURSAL_ID}/products …`);

  const sucursal = db.collection("branches").doc(SUCURSAL_ID);
  const lote = db.batch();
  const ahora = admin.firestore.FieldValue.serverTimestamp();

  lote.set(sucursal, { name: "Cafecaro Centro", code: SUCURSAL_ID, updatedAt: ahora }, { merge: true });

  for (const p of productos) {
    const id = slugify(`${p.category} ${p.name}`);
    lote.set(sucursal.collection("products").doc(id), { ...p, updatedAt: ahora }, { merge: true });
  }

  await lote.commit();
  console.log(`✅ ${productos.length} productos cargados/actualizados.\n`);
}

seedMenu()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error al cargar el menú:\n", err);
    process.exit(1);
  });
