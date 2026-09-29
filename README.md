# Cafetería Doña Caro — Sistema de pedidos (PWA)

Punto de venta y gestión de pedidos de **Cafetería Doña Caro**.
Corre completo en el hosting (Hostinger Business): páginas HTML/CSS/JS + **API en PHP 8.3** + **MySQL/MariaDB**.
No depende de servicios externos. Se instala como app (PWA) en celulares y tablets.

Producción: `https://cafedecaro.eniguala.com/`

## Pantallas

| Archivo | Quién | Qué hace |
|---|---|---|
| `index.html` | Público | Landing y menú (de la base de datos; respaldo en `data/menu-inicial.json`) |
| `cliente.html` | Cliente, sin sesión | Pedido desde la mesa. QR: `cliente.html?mesa=PB-01` |
| `login.html` | Personal | Inicio de sesión; lleva a la pantalla de su rol |
| `mesas.html` | admin, mesero, caja | Mapa de mesas (se actualiza cada 5 s) |
| `mesero.html` | admin, mesero, caja | Abrir pedido por mesa, agregar/quitar productos, cerrar cuenta |
| `cocina.html` | admin, cocina | Tablero de cocina: nuevos → en preparación → listos → entregado (cada 4 s, con sonido) |
| `caja.html` | admin, caja | Cuentas y cobros (quién cobra se define en `api/config.php`) |
| `reportes.html` | admin, caja | Ventas por periodo y forma de pago |
| `admin.html` | admin | Usuarios (correo, contraseña, rol) y productos del menú |

## Estructura

```
├── *.html                  Pantallas (sin scripts en línea)
├── css/estilos.css         Sistema de diseño (oscuro, mobile first)
├── js/api.js               Llamadas a la API, token CSRF y consulta periódica
├── js/auth-guard.js        Verificación de sesión/rol y encabezado común
├── js/utils.js             h() para crear DOM seguro, formatos, estados
├── js/paginas/*.js         Lógica de cada pantalla
├── js/pwa.js · sw.js       Service Worker (PWA)
├── api/                    Backend PHP
│   ├── _inicio.php         Conexión, sesión, seguridad y utilidades (no accesible desde web)
│   ├── _esquema.sql        Tablas de MySQL (no accesible desde web)
│   ├── auth.php            Iniciar/cerrar sesión
│   ├── productos.php       Menú
│   ├── ordenes.php         Pedidos, cocina, cobros
│   ├── usuarios.php        Personal
│   ├── instalar.php        Instalación inicial (se bloquea sola al terminar)
│   ├── config.example.php  Plantilla de configuración
│   └── config.php          Datos de la base de datos (NO se sube a GitHub)
├── data/menu-inicial.json  Menú base
└── img/                    Logo e íconos
```

## Seguridad

- **Precios y totales los calcula el servidor** con los precios de la base de datos; lo que mande el navegador se ignora.
- Contraseñas con `password_hash` (bcrypt). Bloqueo tras 8 intentos fallidos en 15 min por IP.
- Sesión con cookie `HttpOnly` + `SameSite=Lax` y token **CSRF** en todas las acciones del personal.
- Permisos por rol en cada endpoint de la API (la interfaz solo oculta pantallas).
- Nadie puede cambiarse su propio rol, desactivarse ni eliminarse.
- Pedidos de clientes: máximo 50 productos y 6 pedidos por IP cada 10 minutos (configurable).
- Consultas preparadas (PDO) en todo el backend: sin inyección SQL.
- Sin `innerHTML` con datos: todo el texto se inserta con `h()` / `textContent`.
- `.htaccess` con Content-Security-Policy estricta (solo scripts del propio sitio) y bloqueo de
  `api/config.php`, `api/_*.php`, `*.sql`, `*.md` y archivos ocultos.

## Instalación en Hostinger

1. **Subdominio:** hPanel → Dominios → Subdominios → `cafedecaro.eniguala.com`.
2. **Base de datos:** hPanel → Bases de datos → Administración → crea una base, un usuario y su contraseña.
3. **Subir archivos** a la carpeta del subdominio (Administrador de archivos o *Git* en hPanel).
4. **Configurar:** en el servidor, copia `api/config.example.php` como `api/config.php` y llena:
   - `db_nombre`, `db_usuario`, `db_clave` (del paso 2; el host es `localhost`),
   - `clave_instalacion`: un texto largo y secreto que solo tú conozcas.
5. **Instalar:** abre `https://cafedecaro.eniguala.com/api/instalar.php`, escribe la clave de instalación,
   tu correo y una contraseña. Se crean las tablas, tu usuario administrador y (opcional) el menú inicial.
   Después el instalador queda bloqueado; si quieres, borra `api/instalar.php`.
6. **SSL:** hPanel → Seguridad → SSL → activa el certificado y *Forzar HTTPS*.
7. **PHP:** verifica en hPanel → Avanzado → Configuración de PHP que la versión sea 8.1 o mayor (8.3 recomendado).
8. Entra a `login.html`, da de alta al personal en **Admin → Usuarios** y revisa precios en **Admin → Productos**.
9. Imprime los QR de cada mesa con la URL `https://cafedecaro.eniguala.com/cliente.html?mesa=PB-01`.

### Configuración opcional (`api/config.php`)

- `roles_cobro`: quién puede registrar cobros. Por defecto `['admin']`; usa `['admin', 'caja']` para que la caja cobre.
- `max_pedidos_cliente_por_10min`: límite de pedidos por IP desde `cliente.html`.

### Al publicar cambios

Sube `CACHE_VERSION` en `sw.js` (ej. `cafedecaro-v3`) para que las apps instaladas tomen la versión nueva.

### Respaldos

Hostinger hace respaldos automáticos (hPanel → Archivos → Copias de seguridad). Para un respaldo manual de los
pedidos: hPanel → Bases de datos → phpMyAdmin → Exportar.

## Desarrollo local

Requiere PHP ≥ 8.1 con `pdo_mysql` y un MySQL/MariaDB:

```bash
cp api/config.example.php api/config.php   # y edita los datos de tu base local
php -S localhost:8080                      # abre http://localhost:8080/api/instalar.php
```

`php -S` no aplica el `.htaccess`; los bloqueos de archivos solo funcionan en Apache/LiteSpeed (Hostinger).
