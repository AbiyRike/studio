import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
      
      // Set localStorage flag for backward compatibility
      const script = `
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = '${redirectTo}';
      `;
      
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Authenticating...</title>
            <meta http-equiv="refresh" content="0;url=${redirectTo}">
          </head>
          <body>
            <p>Authenticating...</p>
            <script>${script}</script>
          </body>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    } catch (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login?error=auth', request.url));
    }
  }

  // Redirect to dashboard if no code (shouldn't happen in normal flow)
  return NextResponse.redirect(new URL('/dashboard', request.url));
}