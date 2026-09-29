<?php
// POST /api/auth/logout
declare(strict_types=1);

if (usuarioActual()) verificarCsrf();
cerrarSesionUsuario();
responder(['ok' => true, 'csrf' => tokenCsrf()]);
