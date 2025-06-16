
"use client";

import { useEffect, useState } from 'react';
import { DocumentHistoryCard } from "@/components/document-history-card";
import { getLearningHistory, type HistoryItem } from '@/lib/session-store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpenCheck, HistoryIcon, Home } from 'lucide-react';
import { redirect } from 'next/navigation';

// This client-side component will handle the auth check and redirect if necessary
const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHistory(getLearningHistory());
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold font-headline mb-8 text-center">Your Learning History</h1>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 border rounded-lg shadow animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </ClientAuthGuard>
    );
  }

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center mb-8">
          <HistoryIcon className="h-16 w-16 text-primary mb-4" />
          <h1 className="text-4xl font-bold font-headline text-center">Learning History</h1>
          <p className="text-muted-foreground mt-2 text-center max-w-prose">
            Review your past learning sessions, summaries, questions, and performance.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10">
            <BookOpenCheck className="mx-auto h-20 w-20 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground mb-4">No learning history yet.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/dashboard">Start a New Session</Link>
              </Button>
               <Button variant="outline" asChild size="lg">
                <Link href="/dashboard"><Home className="mr-2 h-5 w-5" />Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {history.map((item) => (
                <DocumentHistoryCard key={item.id} item={item} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard"><Home className="mr-2 h-5 w-5" />Back to Dashboard</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </ClientAuthGuard>
  );
}
