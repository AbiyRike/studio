
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};

export default function LiveTutorPage() {
  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <GraduationCap className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-headline">Live AI Tutor</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Our interactive AI tutoring experience is on its way!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">
              Get ready for real-time explanations and guided learning sessions with your personal AI tutor.
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClientAuthGuard>
  );
}
