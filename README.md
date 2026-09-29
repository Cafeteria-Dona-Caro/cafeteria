# Cafetería Doña Caro — Sistema de pedidos (PWA)

Punto de venta y gestión de pedidos de **Cafetería Doña Caro**.
Es un sitio **estático** (HTML + CSS + JS) que usa **Firebase** (Authentication + Firestore) como backend.
Se instala como app (PWA) en celulares y tablets.

Producción: `https://cafedecaro.eniguala.com/` (Hostinger Business, sitio estático).

## Pantallas

| Archivo | Quién | Qué hace |
|---|---|---|
| `index.html` | Público | Landing y menú (se lee de Firestore; respaldo en `data/menu-inicial.json`) |
| `cliente.html` | Cliente, sin sesión | Pedido desde la mesa. QR: `cliente.html?mesa=PB-01` |
| `login.html` | Personal | Inicio de sesión; redirige según el rol |
| `mesas.html` | admin, mesero, caja | Mapa de mesas en tiempo real |
| `mesero.html` | admin, mesero, caja | Abrir pedido por mesa, agregar/quitar productos, cerrar cuenta |
| `cocina.html` | admin, cocina | Tablero de cocina (KDS): nuevos → en preparación → listos → entregado |
| `caja.html` | admin, caja | Cuentas y cobros (solo **admin** registra pagos) |
| `reportes.html` | admin, caja | Ventas por periodo y forma de pago |
| `admin.html` | admin | Usuarios/roles y productos del menú |
| `offline.html` | — | Se muestra sin conexión |

Tras iniciar sesión: admin → `admin.html`, caja → `caja.html`, mesero → `mesas.html`, cocina → `cocina.html`.

## Estructura

```
├── *.html                  Pantallas
├── css/estilos.css         Sistema de diseño (oscuro, mobile first)
├── js/firebase-config.js   Configuración de Firebase (único lugar donde se importa el SDK)
├── js/auth-guard.js        Verificación de sesión/rol y encabezado común
├── js/utils.js             h() para crear DOM seguro, formatos, estados
├── js/pwa.js               Registro del Service Worker
├── data/menu-inicial.json  Menú base (para importar desde admin.html)
├── img/                    Logo e íconos de la PWA
├── manifest.json · sw.js   PWA
├── .htaccess               Seguridad y caché en Hostinger
├── firestore.rules         Reglas de seguridad de Firestore (se publican en Firebase)
└── tools/seedMenu.js       Carga del menú por línea de comandos (opcional, no se publica)
```

## Datos (Firestore)

```
users/{uid}                                  role: admin | caja | mesero | cocina
branches/cafecaro-centro/products/{id}       name, category, basePrice, isActive
branches/cafecaro-centro/orders/{id}         tableNumber, status, source, total, paymentStatus, paymentMethod
branches/cafecaro-centro/orders/{id}/items   productId, productName, price, notes
```

Estados de una orden: `abierta` → `en_preparacion` → `lista` → `cerrada`.
El ID de la sucursal está en `js/firebase-config.js` (`SUCURSAL_ID`).

## Seguridad

- **La protección real está en `firestore.rules`.** La verificación de rol en el navegador solo oculta pantallas.
  Publica las reglas en *Firebase Console → Firestore → Reglas* (o `firebase deploy --only firestore:rules`)
  cada vez que cambien.
- Los clientes sin sesión solo pueden crear un pedido en estado `abierta` con total 0. El precio y el nombre
  de cada producto se validan contra el menú. Nadie más que el admin puede marcar un pedido como pagado.
- Nunca insertes datos de Firestore o del usuario con `innerHTML`; usa `h()` de `js/utils.js` o `textContent`.
- Nunca subas claves de servicio (`serviceAccountKey.json`, etc.) al repositorio ni al servidor. Ya están en `.gitignore`.
- La `apiKey` de `firebase-config.js` es pública por diseño en Firebase; no es un secreto.

## Primer uso

1. Publica `firestore.rules` en Firebase.
2. Crea tu cuenta en *Firebase Console → Authentication* y, en *Firestore*, crea el documento
   `users/{tu UID}` con el campo `role: "admin"` (solo esta vez; después todo se hace desde `admin.html`).
3. Entra a `admin.html` → **Productos** → **Importar menú inicial** (o revisa/ajusta los precios).
4. En **Usuarios**, da de alta al personal: primero en Authentication, luego su UID y rol aquí.
5. Genera los códigos QR de cada mesa con la URL `https://cafedecaro.eniguala.com/cliente.html?mesa=PB-01`.

## Despliegue en Hostinger

- Subdominio `cafedecaro.eniguala.com` como sitio estático. Todas las rutas son relativas, así que también
  funciona dentro de una subcarpeta.
- Sube el contenido del repositorio a la carpeta del subdominio (Administrador de archivos o *Git* en hPanel).
- **No hace falta subir:** `tools/`, `node_modules/`, `package*.json`, `firestore.rules`, `README.md`.
  Si se suben (por ejemplo con el despliegue por Git), `.htaccess` los bloquea.
- Activa *SSL → Forzar HTTPS* en hPanel.
- En *Firebase Console → Authentication → Settings → Authorized domains* agrega `cafedecaro.eniguala.com`.
- **Cada vez que publiques cambios**, sube `CACHE_VERSION` en `sw.js` (ej. `cafedecaro-v2`) para que las
  apps instaladas descarguen la versión nueva.

## Desarrollo local

```bash
npm run serve        # http://localhost:8080
```

Carga del menú desde la terminal (opcional, requiere una clave de servicio guardada FUERA del repo):

```bash
npm install
GOOGLE_APPLICATION_CREDENTIALS=~/claves/cafecaro.json npm run seed
```
