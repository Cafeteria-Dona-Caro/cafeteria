# Cafecito de Doña Caro — Sistema de pedidos (PWA)

Punto de venta y gestión de pedidos de **Cafetería Doña Caro**.
Corre completo en el hosting (**Hostinger Business v3**): **PHP 8.3 + MariaDB**, HTML/CSS/JS sin frameworks.
No usa servicios externos: ni bases de datos en la nube, ni CDNs, ni fuentes de terceros. Se instala como app (PWA).

Producción: `https://cafedecaro.eniguala.com/`

## Pantallas

| Página | Quién | Qué hace |
|---|---|---|
| `index.html` | Público | Landing y carta completa con descripciones |
| `cliente.html` | Cliente, sin sesión | Pedido desde la mesa. QR: `cliente.html?mesa=PB-01` |
| `login.html` | Personal | Inicio de sesión; lleva a la pantalla de su rol |
| `mesas.html` | admin, mesero | Mapa de mesas en **tiempo real** |
| `mesero.html` | admin, mesero, caja | Abrir cuenta por mesa o para llevar, agregar/quitar productos, marcar entregada |
| `cocina.html` | admin, cocina | Tablero de cocina en **tiempo real** con sonido: nuevas → en preparación → listas |
| `caja.html` | admin, caja | Cobrar (forma de pago, descuento, cambio) y cancelar órdenes, en **tiempo real** |
| `reportes.html` | admin | Ventas cobradas por periodo, por forma de pago y productos más vendidos |
| `admin.html` | admin | Usuarios (correo, contraseña, rol, activo) y productos/categorías |

Flujo de una orden: **abierta → en_preparacion → lista → entregada → cobrada** (o **cancelada**).
Si se agrega un producto a una orden lista o entregada, vuelve a cocina como *abierta* y el producto nuevo se marca como NUEVO.

## Estructura

```
cafedecaro/
├── .htaccess              /api/* → api/router.php · todo lo demás → public/ · seguridad y caché
├── config/
│   ├── config.ejemplo.php Plantilla (sin credenciales)
│   └── config.php         Credenciales reales (NO se versiona, no se sirve)
├── api/
│   ├── .htaccess          Todo pasa por router.php
│   ├── router.php         Enrutador REST
│   ├── instalar.php       Instalación inicial (se bloquea sola)
│   ├── lib/               db.php · sesion.php · respuesta.php · validar.php · ordenes.php
│   ├── auth/              login · logout · yo
│   ├── productos/         listar · crear · editar · estado
│   ├── ordenes/           crear · listar · detalle · estado · cobrar · agregar_item · quitar_item
│   ├── mesas/             listar · mapa
│   ├── reportes/          ventas
│   ├── usuarios/          listar · crear · editar · eliminar
│   └── sse/eventos.php    Tiempo real (Server-Sent Events)
├── db/
│   ├── esquema.sql        Tablas
│   └── semilla.sql        Carta "Cafecito de Doña Caro" (91 productos, 16 categorías) y 18 mesas
└── public/                Lo único que ve el navegador
    ├── *.html · manifest.json · sw.js
    ├── css/estilos.css    Sistema de diseño oscuro, mobile first
    ├── fonts/             Inter y Outfit (alojadas aquí, licencia OFL)
    ├── js/api.js · auth.js · sse.js · utils.js · pwa.js
    ├── js/paginas/*.js    Lógica de cada pantalla (sin JavaScript en línea)
    ├── data/menu-inicial.json  Carta de respaldo si la API no responde
    └── img/               Logo e íconos
```

## API

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | — | Iniciar sesión |
| POST | `/api/auth/logout` | cualquiera | Cerrar sesión |
| GET | `/api/auth/yo` | — | Usuario actual (o `null`) y token CSRF |
| GET | `/api/productos` | — | Carta (solo disponibles); `?todos=1` para admin |
| POST | `/api/productos` | admin | Crear producto (con categoría existente o nueva) |
| PUT | `/api/productos/{id}` | admin | Editar nombre, precio, descripción, categoría |
| PATCH | `/api/productos/{id}/estado` | admin | Disponible / no disponible |
| POST | `/api/ordenes` | — / personal | Cliente: crea orden. Personal: abre o retoma la cuenta de la mesa |
| GET | `/api/ordenes` | personal | Órdenes activas; filtros `estado`, `desde`, `hasta` |
| GET | `/api/ordenes/{id}` | personal | Orden con ítems |
| PATCH | `/api/ordenes/{id}/estado` | cocina, mesero, caja, admin | Cambiar estado (según rol) |
| POST | `/api/ordenes/{id}/cobrar` | caja, admin | Cobrar: forma de pago y descuento |
| POST | `/api/ordenes/{id}/items` | mesero, caja, admin | Agregar producto a la cuenta |
| DELETE | `/api/ordenes/{id}/items/{item}` | mesero, caja, admin | Quitar producto (si cocina no lo empezó) |
| GET | `/api/mesas` | — | Mesas |
| GET | `/api/mesas/mapa` | mesero, admin | Mesas con sus órdenes activas |
| GET | `/api/reportes/ventas` | admin | Ventas por fecha |
| GET/POST/PUT/DELETE | `/api/usuarios[/{id}]` | admin | Personal |
| GET | `/api/sse/eventos` | personal | Tiempo real (SSE) |

Si el firewall del hosting bloqueara PUT/PATCH/DELETE, la API también los acepta como POST con la cabecera
`X-HTTP-Method-Override: PUT|PATCH|DELETE`.

## Tiempo real (SSE)

Cada cambio en una orden o producto se guarda en la tabla `eventos`. Las pantallas del personal mantienen abierta
una conexión a `/api/sse/eventos`, que revisa esa tabla dos veces por segundo y envía lo nuevo al instante.
Cada conexión dura ~55 s y el navegador se reconecta solo, sin perder eventos (`Last-Event-ID`).
El punto verde junto al nombre del usuario indica que la conexión está activa.

Cada pantalla de cocina/caja/mesas/mesero abierta ocupa un proceso PHP mientras está conectada. Para una
cafetería (unas cuantas tablets) es holgado para el plan Business; si hubiera muchas pantallas simultáneas y el
hosting empezara a rechazar conexiones, esa es la causa.

Los eventos de más de 24 h se borran solos. Opcional: CRON en hPanel cada hora con
`DELETE FROM eventos WHERE creado_en < NOW() - INTERVAL 24 HOUR`.

## Seguridad

- **Precios y totales los calcula el servidor**: el navegador solo envía `producto_id`, `cantidad` y notas.
- Consultas preparadas (PDO) en todo el backend; `strict_types` y enums de PHP 8.3.
- Contraseñas con `password_hash(PASSWORD_BCRYPT)`. Bloqueo por IP tras **5 intentos fallidos en 15 min**.
- Sesión con cookie `HttpOnly`, `Secure` (en HTTPS) y `SameSite=Strict`; token **CSRF** y verificación de `Origin`.
- Permisos por rol en cada endpoint. Nadie puede cambiar su propio rol, desactivarse ni eliminarse.
  Si el admin desactiva a alguien, su sesión deja de funcionar al instante.
- Pedidos desde el QR: la mesa debe existir; máx. 50 productos y 6 pedidos por IP cada 10 min.
- Sin `innerHTML` con datos: todo el texto se inserta como texto (`h()` / `textContent`).
- Content-Security-Policy estricta: solo archivos del propio sitio, ningún script en línea.
- `config/`, `db/`, `api/lib/`, `.git`, `README.md` no son accesibles desde el navegador.

## Instalación en Hostinger

1. **Subdominio:** hPanel → Dominios → Subdominios → `cafedecaro.eniguala.com`.
2. **Base de datos:** hPanel → Bases de datos → Administración → crea base, usuario y contraseña.
3. **Subir** todo el repositorio a la carpeta del subdominio (Administrador de archivos o *Git* en hPanel).
4. **Configurar:** copia `config/config.ejemplo.php` como `config/config.php` y llena los datos de la base
   (host `127.0.0.1` o `localhost`) y una `clave_instalacion` larga y secreta.
5. **Instalar** (elige una):
   - **Recomendado:** abre `https://cafedecaro.eniguala.com/api/instalar`, escribe la clave de instalación,
     tu correo y contraseña. Crea las tablas, carga la carta y las mesas, y tu usuario administrador.
   - **Manual:** en phpMyAdmin importa `db/esquema.sql` y luego `db/semilla.sql`; después abre
     `/api/instalar` solo para crear el administrador (las tablas ya existentes no se tocan).

   En cuanto existe un usuario, el instalador queda bloqueado.
6. **PHP:** hPanel → Avanzado → Configuración de PHP → versión **8.3**.
7. **SSL:** hPanel → Seguridad → SSL → activar y *Forzar HTTPS*.
8. Entra a `login.html`, da de alta al personal en **Admin → Usuarios** y revisa la carta en **Admin → Productos**.
9. Imprime los QR de cada mesa: `https://cafedecaro.eniguala.com/cliente.html?mesa=PB-01` (PB-01…PB-08, PA-01…PA-06, B-01…B-04).

> Por qué no hay usuario admin en `semilla.sql`: una contraseña fija dentro de un archivo del repositorio
> sería la puerta de entrada para cualquiera que la lea. El instalador la pide una sola vez.

### Al publicar cambios

Sube `CACHE_VERSION` en `public/sw.js` (ej. `cafedecaro-v4`) para que las apps instaladas tomen la versión nueva.

### Respaldos

hPanel → Archivos → Copias de seguridad (automáticas), o phpMyAdmin → Exportar.

## Desarrollo local

PHP ≥ 8.3 con `pdo_mysql` y MariaDB/MySQL. El sitio necesita Apache/LiteSpeed (usa `.htaccess`):
apunta el `DocumentRoot` a la carpeta del proyecto con `AllowOverride All` y `mod_rewrite`.
