import { AppShell } from "@/components/layout/app-shell";
import type { Metadata } from 'next';
import { redirect } from 'next/navigation'; // Import redirect

export const metadata: Metadata = {
  title: 'Gemini AI Tutor',
};

// This is a conceptual check. In a real app, this would involve server-side session validation or middleware.
async function checkAuth() {
  // For this example, we can't access localStorage on the server.
  // In a real app, this would be a cookie check or API call.
  // This function will effectively be a no-op for server components without actual auth.
  // Client-side checks will handle redirection if localStorage indicates not logged in.
  return true; // Assume logged in for server components initially
}


export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const isLoggedIn = await checkAuth();
  // if (!isLoggedIn) {
  //   redirect('/login');
  // }
  // Actual auth check with redirect would happen in middleware or client-side effect on pages for this mocked setup

  return <AppShell>{children}</AppShell>;
}
