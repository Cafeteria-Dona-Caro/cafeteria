import { auth } from "../api.js";
import { INICIO_POR_ROL } from "../auth.js";
import { mostrarEstado } from "../utils.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const statusBox = document.getElementById("statusBox");

function redirigir(rol) {
  const destino = INICIO_POR_ROL[rol];
  if (destino) window.location.replace(destino);
}

// Si ya hay sesión, entrar directo (también obtiene el token CSRF)
try {
  const { usuario } = await auth.yo();
  if (usuario) redirigir(usuario.rol);
} catch (err) {
  mostrarEstado(statusBox, err.message, "error");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    mostrarEstado(statusBox, "Escribe tu correo y contraseña.", "error");
    return;
  }
  loginBtn.disabled = true;
  mostrarEstado(statusBox, "Entrando…", "info");
  try {
    const { usuario } = await auth.login(email, password);
    redirigir(usuario.rol);
  } catch (err) {
    mostrarEstado(statusBox, err.message, "error");
    passwordInput.select();
  } finally {
    loginBtn.disabled = false;
  }
});
