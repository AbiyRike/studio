
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};

export default function FlashcardsPage() {
  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <Layers className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-headline">Flashcards (from Knowledge Base)</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              This exciting feature is currently under development.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">
              Soon, you'll be able to create and study with AI-powered flashcards generated from content in your knowledge base!
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
