import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { PATHNAME_HEADER } from "@/lib/auth/constants";

// Rutas que exigen sesión. El resto (inicio, búsqueda, máquinas, fichas y
// archivos) es de acceso libre para clientes finales: sin sesión, el servidor
// muestra solo lo marcado para clientes (documentVisibilityFilter).
const PRIVATE_PATHS = ["/admin", "/cuenta"];

/**
 * Chequeo optimista: en rutas privadas, si no hay cookie de sesión, manda al
 * login sin renderizar. La verificación real (sesión válida, usuario activo,
 * rol) se hace en el servidor con `requireUser` / `requireAdmin` en cada página
 * y Server Action.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPrivate = PRIVATE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isPrivate && !getSessionCookie(request, { cookiePrefix: "biblioteca" })) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Para que `requireUser` pueda volver a esta página si la sesión resulta inválida.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname + search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Todo menos assets estáticos de Next y archivos públicos.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|ico|txt)$).*)",
  ],
};
