import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { PATHNAME_HEADER } from "@/lib/auth/constants";

// Rutas que no requieren sesión.
const PUBLIC_PATHS = [
  "/login",
  "/olvide-contrasena",
  "/restablecer/",
  "/invitacion/",
  "/api/health",
];

/**
 * Chequeo optimista: si no hay cookie de sesión, manda al login sin renderizar.
 * La verificación real (sesión válida, usuario activo, rol) se hace en el
 * servidor con `requireUser` / `requireAdmin` en cada página y Server Action.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!getSessionCookie(request, { cookiePrefix: "biblioteca" })) {
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
