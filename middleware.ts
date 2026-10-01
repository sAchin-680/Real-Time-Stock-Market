import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const hasSession = Boolean(getSessionCookie(request));
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (!hasSession && !isPublic) {
        const url = new URL("/sign-in", request.url);
        if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
        return NextResponse.redirect(url);
    }

    // Cookie presence is only a fast-path hint; layouts still verify the session server-side.
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|assets|robots.txt).*)',
    ],
};
