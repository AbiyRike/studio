import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Check if the user is authenticated using cookies
  const supabaseCookie = req.cookies.get('sb-access-token')?.value || 
                         req.cookies.get('sb-refresh-token')?.value ||
                         req.cookies.get('sb-auth-token')?.value;
  
  // For backward compatibility, also check localStorage via cookies
  const legacyAuthCookie = req.cookies.get('isLoggedIn')?.value;
  
  const isAuthenticated = !!supabaseCookie || !!legacyAuthCookie;
  
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                     req.nextUrl.pathname.startsWith('/signup') ||
                     req.nextUrl.pathname === '/';

  // Redirect unauthenticated users to login page
  if (!isAuthenticated && !isAuthPage && req.nextUrl.pathname !== '/auth/callback') {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage && req.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};