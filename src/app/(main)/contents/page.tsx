"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KnowledgeBaseContentsDisplay } from '@/components/knowledge-base-contents-display';
import { Sparkles, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('isLoggedIn')) {
        router.push('/login');
      } else {
        setIsVerified(true);
      }
    }
  }, [router]);

  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Sparkles className="h-12 w-12 animate-pulse text-primary" />
      </div>
    );
  }
  return <>{children}</>;
};


export default function ContentsPage() {
  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center mb-10">
          <Library className="h-16 w-16 text-primary mb-4" />
          <h1 className="text-4xl font-bold font-headline text-center">Your Knowledge Library</h1>
          <p className="text-muted-foreground mt-2 text-center max-w-prose">
            Browse, search, and access all the content you've added to Study AI+.
          </p>
        </div>
        <KnowledgeBaseContentsDisplay />
         <div className="mt-12 text-center">
            <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}