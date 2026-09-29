<?php
// GET /api/auth/yo  → { usuario | null, csrf }
declare(strict_types=1);

$usuario = usuarioActual();
responder(['usuario' => $usuario, 'csrf' => tokenCsrf()]);
