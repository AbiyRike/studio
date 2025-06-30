import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Skip auth check for auth-related routes
  if (
    req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/signup') ||
    req.nextUrl.pathname === '/' ||
    req.nextUrl.pathname.startsWith('/auth/callback')
  ) {
    return res;
  }
  
  // Check if the user is authenticated using cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    // If Supabase is not configured, fall back to localStorage check
    const isLoggedIn = req.cookies.get('isLoggedIn')?.value === 'true';
    
    if (!isLoggedIn) {
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    return res;
  }
  
  // Create a Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
  
  // Get the session from the request
  const { data: { session } } = await supabase.auth.getSession();
  
  // For backward compatibility, also check localStorage via cookies
  const legacyAuthCookie = req.cookies.get('isLoggedIn')?.value === 'true';
  
  const isAuthenticated = !!session || legacyAuthCookie;
  
  // Redirect unauthenticated users to login page
  if (!isAuthenticated) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};