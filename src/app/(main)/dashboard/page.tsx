import { ContentUploader } from "@/components/content-uploader";
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard - Gemini AI Tutor',
};

// This client-side component will handle the auth check and redirect if necessary
// For server components, auth would ideally be handled by middleware.
const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};


export default function DashboardPage() {
  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8">
        <ContentUploader />
      </div>
    </ClientAuthGuard>
  );
}
