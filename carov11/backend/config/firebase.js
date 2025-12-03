const admin = require("firebase-admin");
const path = require("path");
const SERVICE_ACCOUNT_FILE = "../serviceAccountKey.json"; 
let db;
function initializeFirebase() {
  try {
    const serviceAccount = require(path.join(__dirname, SERVICE_ACCOUNT_FILE));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    console.log("🔥 Firestore conectado");
  } catch (error) { console.error("❌ Error Firebase:", error.message); }
}
function getDb() { return db; }
module.exports = { initializeFirebase, getDb, admin };
