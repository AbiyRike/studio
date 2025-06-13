"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InteractiveQuiz } from '@/components/interactive-quiz';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTemporarySessionData } from '@/lib/session-store';
import type { TutorSessionData } from '@/app/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';


// This client-side component will handle the auth check and redirect if necessary
// For server components, auth would ideally be handled by middleware.
const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};


export default function TutorPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<TutorSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = getTemporarySessionData();
    if (data) {
      setSessionData(data);
    } else {
      setError("No session data found. Please start a new session from the dashboard.");
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ClientAuthGuard>
    );
  }

  if (error || !sessionData) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive">Session Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Could not load session data."}</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2">{sessionData.documentName}</h1>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-headline">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/90 leading-relaxed">{sessionData.summary}</p>
            </CardContent>
          </Card>
        </div>
        <InteractiveQuiz sessionData={sessionData} />
      </div>
    </ClientAuthGuard>
  );
}
