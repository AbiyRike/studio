
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InteractiveQuiz } from '@/components/interactive-quiz';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { getActiveTutorSession, TutorSessionData } from '@/lib/session-store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { AvatarPlaceholder } from '@/components/avatar-placeholder';

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
        <AvatarPlaceholder 
          message="Let's test your knowledge!"
          subMessage={`Topic: ${sessionData.documentName}`}
        />

        {sessionData.mediaDataUri && (
            <Card className="shadow-md mb-6">
              <CardHeader>
                <CardTitle className="text-xl font-headline flex items-center">
                  <ImageIcon className="mr-2 h-6 w-6 text-primary" /> Associated Image
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Image 
                  src={sessionData.mediaDataUri} 
                  alt="Associated media" 
                  width={400} 
                  height={300} 
                  className="rounded-md object-contain max-h-[300px]"
                />
              </CardContent>
            </Card>
          )}
        
        <InteractiveQuiz sessionData={sessionData} />
      </div>
    </ClientAuthGuard>
  );
}
