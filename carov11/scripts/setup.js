import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('\x1b[36m%s\x1b[0m', '\n☕ ASISTENTE DE INSTALACIÓN CAFÉ CARO ERP ☕\n');

async function main() {
  console.log('📦 1. Instalando dependencias del Frontend (React)...');
  try { execSync('npm install', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' }); } catch (e) {}

  console.log('\n📦 2. Instalando dependencias del Backend (Node)...');
  try { execSync('npm install', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' }); } catch (e) {}

  console.log('\n☁️  3. Configuración de Firebase (Frontend)');
  console.log('   Pega tus credenciales de la consola de Firebase:\n');

  const apiKey = await question('   ApiKey: ');
  const authDomain = await question('   AuthDomain: ');
  const projectId = await question('   ProjectId: ');
  const storageBucket = await question('   StorageBucket: ');
  const messagingSenderId = await question('   MessagingSenderId: ');
  const appId = await question('   AppId: ');

  const content = `export const firebaseConfig = {
  apiKey: "${apiKey.trim()}",
  authDomain: "${authDomain.trim()}",
  projectId: "${projectId.trim()}",
  storageBucket: "${storageBucket.trim()}",
  messagingSenderId: "${messagingSenderId.trim()}",
  appId: "${appId.trim()}"
};`;

  fs.writeFileSync(path.join(rootDir, 'frontend', 'src', 'firebaseConfig.js'), content);
  
  console.log('\x1b[32m%s\x1b[0m', '\n✅ ¡Instalación Completada! Ejecuta:');
  console.log('\x1b[33m%s\x1b[0m', '   cd frontend && npm run dev');
  rl.close();
}
main();
