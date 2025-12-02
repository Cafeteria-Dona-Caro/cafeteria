/**
 * SEEDER OFICIAL — CAFECARO (cafecaro-af23b)
 * Carga el menú completo en: branches/{BRANCH_ID}/products
 * Ejecutar desde consola: node seedMenu.js
 */

const admin = require("firebase-admin");
const path = require("path");

// 1) CARGAR CREDENCIALES DEL SERVICE ACCOUNT (LOCAL)
// En Firebase Console → Configuración del proyecto → Cuentas de servicio → "Generar nueva clave privada"
// Guarda el archivo como: serviceAccountKey.json (en esta misma carpeta)
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

// 2) INICIALIZAR FIREBASE ADMIN
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "cafecaro-af23b",
});

const db = admin.firestore();

// 3) ID DE LA SUCURSAL DONDE SE GUARDARÁ EL MENÚ
// Puedes cambiarlo si después tienes varias sucursales
const BRANCH_ID = "cafecaro-centro";

// 4) MENÚ COMPLETO – CAFETERÍA DOÑA CARO
// Extraído de tu menú HTML
const products = [
  // ==========================
  // CAFÉS CALIENTES - TRADICIONALES
  // ==========================
  {
    name: "Café de la casa",
    category: "Cafés calientes",
    basePrice: 35,
    printableName: "Café de la casa",
    isActive: true,
  },
  {
    name: "Café de olla",
    category: "Cafés calientes",
    basePrice: 35,
    printableName: "Café de olla",
    isActive: true,
  },
  {
    name: "Café americano",
    category: "Cafés calientes",
    basePrice: 35,
    printableName: "Americano",
    isActive: true,
  },
  {
    name: "Café americano doble",
    category: "Cafés calientes",
    basePrice: 40,
    printableName: "Americano doble",
    isActive: true,
  },
  {
    name: "Expresso sencillo",
    category: "Cafés calientes",
    basePrice: 35,
    printableName: "Expresso sencillo",
    isActive: true,
  },
  {
    name: "Expresso doble",
    category: "Cafés calientes",
    basePrice: 45,
    printableName: "Expresso doble",
    isActive: true,
  },
  {
    name: "Expresso cortado",
    category: "Cafés calientes",
    basePrice: 40,
    printableName: "Expresso cortado",
    isActive: true,
  },

  // ==========================
  // CAFÉS CALIENTES - ESPECIALIDADES Y SABORES
  // ==========================
  {
    name: "Cappuccino",
    category: "Cafés calientes",
    basePrice: 60,
    printableName: "Cappuccino",
    isActive: true,
  },
  {
    name: "Cappuccino con sabor (Avellana, Rol de canela, Crema irlandesa, Vainilla)",
    category: "Cafés calientes",
    basePrice: 70,
    printableName: "Cappuccino sabor",
    isActive: true,
  },
  {
    name: "Moka",
    category: "Cafés calientes",
    basePrice: 60,
    printableName: "Moka",
    isActive: true,
  },
  {
    name: "Café latte",
    category: "Cafés calientes",
    basePrice: 65,
    printableName: "Latte",
    isActive: true,
  },
  {
    name: "Affogato",
    category: "Cafés calientes",
    basePrice: 65,
    printableName: "Affogato",
    isActive: true,
  },
  {
    name: "Chocolate (agua o leche)",
    category: "Cafés calientes",
    basePrice: 55,
    printableName: "Chocolate",
    isActive: true,
  },
  {
    name: "Chai caliente",
    category: "Cafés calientes",
    basePrice: 60,
    printableName: "Chai caliente",
    isActive: true,
  },
  {
    name: "Café de anís",
    category: "Cafés calientes",
    basePrice: 40,
    printableName: "Café de anís",
    isActive: true,
  },
  {
    name: "Café de clavo",
    category: "Cafés calientes",
    basePrice: 40,
    printableName: "Café de clavo",
    isActive: true,
  },

  // ==========================
  // TISANAS CALIENTES
  // ==========================
  {
    name: "Frutos de la vida",
    category: "Tisanas calientes",
    basePrice: 60,
    printableName: "Tisana frutos de la vida",
    isActive: true,
  },
  {
    name: "Maracuyá",
    category: "Tisanas calientes",
    basePrice: 60,
    printableName: "Tisana maracuyá",
    isActive: true,
  },
  {
    name: "Frutos tropicales",
    category: "Tisanas calientes",
    basePrice: 60,
    printableName: "Tisana frutos tropicales",
    isActive: true,
  },
  {
    name: "Frutos de la pasión",
    category: "Tisanas calientes",
    basePrice: 60,
    printableName: "Tisana frutos de la pasión",
    isActive: true,
  },
  {
    name: "Fruta caribeña",
    category: "Tisanas calientes",
    basePrice: 60,
    printableName: "Tisana fruta caribeña",
    isActive: true,
  },

  // ==========================
  // TISANAS FRÍAS
  // ==========================
  {
    name: "Frutos de la vida",
    category: "Tisanas frías",
    basePrice: 65,
    printableName: "Tisana fría frutos de la vida",
    isActive: true,
  },
  {
    name: "Maracuyá",
    category: "Tisanas frías",
    basePrice: 65,
    printableName: "Tisana fría maracuyá",
    isActive: true,
  },
  {
    name: "Frutos tropicales",
    category: "Tisanas frías",
    basePrice: 65,
    printableName: "Tisana fría frutos tropicales",
    isActive: true,
  },
  {
    name: "Frutos de la pasión",
    category: "Tisanas frías",
    basePrice: 65,
    printableName: "Tisana fría frutos de la pasión",
    isActive: true,
  },
  {
    name: "Fruta caribeña",
    category: "Tisanas frías",
    basePrice: 65,
    printableName: "Tisana fría fruta caribeña",
    isActive: true,
  },

  // ==========================
  // SODAS ITALIANAS
  // ==========================
  {
    name: "Frutos rojos",
    category: "Sodas italianas",
    basePrice: 65,
    printableName: "Soda frutos rojos",
    isActive: true,
  },
  {
    name: "Coco",
    category: "Sodas italianas",
    basePrice: 65,
    printableName: "Soda coco",
    isActive: true,
  },
  {
    name: "Mojito",
    category: "Sodas italianas",
    basePrice: 65,
    printableName: "Soda mojito",
    isActive: true,
  },
  {
    name: "Conga",
    category: "Sodas italianas",
    basePrice: 65,
    printableName: "Soda conga",
    isActive: true,
  },
  {
    name: "Fruta del dragón",
    category: "Sodas italianas",
    basePrice: 65,
    printableName: "Soda fruta del dragón",
    isActive: true,
  },
  {
    name: "Mora azul",
    category: "Sodas italianas",
    basePrice: 65,
    printableName: "Soda mora azul",
    isActive: true,
  },

  // ==========================
  // CAFÉS FRÍOS
  // ==========================
  {
    name: "Latte frío",
    category: "Cafés fríos",
    basePrice: 65,
    printableName: "Latte frío",
    isActive: true,
  },
  {
    name: "Moka frío",
    category: "Cafés fríos",
    basePrice: 60,
    printableName: "Moka frío",
    isActive: true,
  },

  // ==========================
  // FRAPPE
  // ==========================
  {
    name: "Oreo",
    category: "Frappe",
    basePrice: 65,
    printableName: "Frappe Oreo",
    isActive: true,
  },
  {
    name: "Mazapán",
    category: "Frappe",
    basePrice: 65,
    printableName: "Frappe Mazapán",
    isActive: true,
  },
  {
    name: "Moka",
    category: "Frappe",
    basePrice: 65,
    printableName: "Frappe Moka",
    isActive: true,
  },
  {
    name: "Vainilla",
    category: "Frappe",
    basePrice: 60,
    printableName: "Frappe Vainilla",
    isActive: true,
  },
  {
    name: "Caramelo",
    category: "Frappe",
    basePrice: 60,
    printableName: "Frappe Caramelo",
    isActive: true,
  },
  {
    name: "Chocolate",
    category: "Frappe",
    basePrice: 65,
    printableName: "Frappe Chocolate",
    isActive: true,
  },

  // ==========================
  // SMOOTHIES
  // ==========================
  {
    name: "Fresa",
    category: "Smoothies",
    basePrice: 55,
    printableName: "Smoothie fresa",
    isActive: true,
  },
  {
    name: "Plátano",
    category: "Smoothies",
    basePrice: 55,
    printableName: "Smoothie plátano",
    isActive: true,
  },
  {
    name: "Mango",
    category: "Smoothies",
    basePrice: 55,
    printableName: "Smoothie mango",
    isActive: true,
  },

  // ==========================
  // CHAMOYADAS
  // ==========================
  {
    name: "Mango",
    category: "Chamoyadas",
    basePrice: 60,
    printableName: "Chamoyada mango",
    isActive: true,
  },
  {
    name: "Tamarindo",
    category: "Chamoyadas",
    basePrice: 60,
    printableName: "Chamoyada tamarindo",
    isActive: true,
  },
  {
    name: "Fresa",
    category: "Chamoyadas",
    basePrice: 60,
    printableName: "Chamoyada fresa",
    isActive: true,
  },

  // ==========================
  // EMBOTELLADOS Y HELADOS
  // ==========================
  {
    name: "Agua embotellada",
    category: "Embotellados y helados",
    basePrice: 18,
    printableName: "Agua embotellada",
    isActive: true,
  },
  {
    name: "Pepsi",
    category: "Embotellados y helados",
    basePrice: 20,
    printableName: "Pepsi",
    isActive: true,
  },
  {
    name: "Mirinda",
    category: "Embotellados y helados",
    basePrice: 20,
    printableName: "Mirinda",
    isActive: true,
  },
  {
    name: "7UP",
    category: "Embotellados y helados",
    basePrice: 20,
    printableName: "7UP",
    isActive: true,
  },
  {
    name: "Helado bola",
    category: "Embotellados y helados",
    basePrice: 20,
    printableName: "Helado bola",
    isActive: true,
  },
];

// 5) FUNCIÓN QUE CREA/ACTUALIZA LA SUCURSAL Y SIEMBRA EL MENÚ
async function seedMenu() {
  console.log(`\n🌿 Iniciando carga del menú en CAFECARO → branch: "${BRANCH_ID}" ...`);

  const branchRef = db.collection("branches").doc(BRANCH_ID);

  // Aseguramos que el documento de la sucursal exista con info básica
  await branchRef.set(
    {
      name: "Cafecaro Centro",
      code: BRANCH_ID,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const productsCol = branchRef.collection("products");
  const batch = db.batch();

  products.forEach((product) => {
    const docRef = productsCol.doc(); // ID automático
    batch.set(docRef, {
      ...product,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  try {
    await batch.commit();
    console.log("\n✅ MENÚ SUBIDO EXITOSAMENTE");
    console.log(`📌 Total de productos cargados: ${products.length}`);
    console.log(`📌 Ruta: branches/${BRANCH_ID}/products\n`);
  } catch (error) {
    console.error("\n❌ ERROR AL SUBIR EL MENÚ:\n", error);
  } finally {
    process.exit(0);
  }
}

seedMenu();
