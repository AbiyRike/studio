
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InteractiveQuiz } from '@/components/interactive-quiz';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { getActiveTutorSession, TutorSessionData } from '@/lib/session-store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Image as ImageIcon, Home } from 'lucide-react'; // Added Home
import { redirect } from 'next/navigation';
import Image from 'next/image';

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
    const data = getActiveTutorSession();
    if (data) {
      setSessionData(data);
    } else {
      setError("No active session data found. Please start a new session.");
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
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive mt-2">Session Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Could not load session data."}</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                <Home className="mr-2 h-4 w-4" /> Go to Dashboard
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
        {/* AvatarPlaceholder and Image display Card removed as per request */}
        <InteractiveQuiz sessionData={sessionData} />
      </div>
    </ClientAuthGuard>
  );
}
