import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from './lib/supabase';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Get the session from the cookie
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found');
    return res;
  }
  
  // Check if the user is authenticated using cookies
  const authCookie = req.cookies.get('sb-auth-token')?.value;
  const isAuthenticated = !!authCookie;
  
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