// js/firebase-config.js
// Configuración centralizada de Firebase para Café de Caro.
// La apiKey web es pública por diseño: la protección real está en firestore.rules.
// Es el ÚNICO archivo que importa el SDK: para actualizarlo, cambia la versión
// en las tres URLs de abajo.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbxe3uCqt-VnhgFW8sd8uJZ5Wg8oQ0b6Y",
  authDomain: "cafecaro-af23b.firebaseapp.com",
  projectId: "cafecaro-af23b",
  storageBucket: "cafecaro-af23b.firebasestorage.app",
  messagingSenderId: "534231921780",
  appId: "1:534231921780:web:f3702e23c024c14c0c8d21"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ID de la sucursal: un solo lugar para cambiarlo
const SUCURSAL_ID = "cafecaro-centro";

// Referencias frecuentes
const productosRef = () => collection(db, "branches", SUCURSAL_ID, "products");
const ordenesRef = () => collection(db, "branches", SUCURSAL_ID, "orders");
const ordenRef = (ordenId) => doc(db, "branches", SUCURSAL_ID, "orders", ordenId);
const itemsRef = (ordenId) => collection(db, "branches", SUCURSAL_ID, "orders", ordenId, "items");
const usuariosRef = () => collection(db, "users");

export {
  app, auth, db,
  SUCURSAL_ID,
  productosRef, ordenesRef, ordenRef, itemsRef, usuariosRef,
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, writeBatch, Timestamp, serverTimestamp
};
