
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getKnowledgeBaseItems, type KnowledgeBaseItem, getKnowledgeBaseItemById } from '@/lib/knowledge-base-store';
import { setActiveInteractiveTutorSession } from '@/lib/session-store';
import { startInteractiveTutorSession } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, AlertTriangle, FileText, Image as ImageIcon, Mic } from 'lucide-react';
import { format } from 'date-fns';

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
    return null; 
  }
  return <>{children}</>;
};

export default function SelectTutorContentPage() {
  const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setKbItems(getKnowledgeBaseItems());
    setIsLoading(false);
  }, []);

  const handleStartTutoring = async (itemFromList: KnowledgeBaseItem) => {
    setProcessingItemId(itemFromList.id);
    setActiveInteractiveTutorSession(null); 

    // Retrieve the full item from localStorage to ensure we have the latest, complete data
    const fullKbItem = getKnowledgeBaseItemById(itemFromList.id);

    if (!fullKbItem) {
        toast({
            title: "Error Starting Tutoring Session",
            description: "Could not retrieve the knowledge base item. Please try again.",
            variant: "destructive",
        });
        setProcessingItemId(null);
        return;
    }
    if (!fullKbItem.documentContent && !fullKbItem.mediaDataUri) {
      toast({
        title: "Cannot Start Tutoring",
        description: "The selected knowledge base item does not have any text content or associated media to tutor.",
        variant: "destructive",
      });
      setProcessingItemId(null);
      return;
    }


    const result = await startInteractiveTutorSession(fullKbItem); // Pass the full item
    setProcessingItemId(null);

    if ('error' in result) {
      toast({
        title: "Error Starting Tutoring Session",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setActiveInteractiveTutorSession(result);
      toast({
        title: "Tutoring Session Ready!",
        description: `Starting interactive tutoring for "${fullKbItem.documentName}".`,
      });
      router.push('/interactive-tutor/session');
    }
  };
  
  const getIconForContent = (item: KnowledgeBaseItem) => {
    if (item.mediaDataUri?.startsWith('data:image')) {
      return <ImageIcon className="h-5 w-5 text-accent" />;
    }
    if (item.documentName.toLowerCase().includes('audio') || item.documentContent.toLowerCase().includes('audio recording')) {
      return <Mic className="h-5 w-5 text-accent" />;
    }
    return <FileText className="h-5 w-5 text-accent" />;
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold font-headline mb-8 text-center">Select Content for Tutoring</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-6 bg-muted rounded w-3/4"></div></CardHeader>
                <CardContent><div className="h-4 bg-muted rounded w-1/2 mb-2"></div><div className="h-10 bg-muted rounded w-full"></div></CardContent>
                <CardFooter><div className="h-10 bg-muted rounded w-full"></div></CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </ClientAuthGuard>
    );
  }

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8">
        <Card className="mb-8 shadow-lg">
          <CardHeader className="text-center">
            <GraduationCap className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold font-headline">Interactive Tutoring: Select Content</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Choose an item from your knowledge base to begin a step-by-step tutoring session.
            </CardDescription>
          </CardHeader>
        </Card>

        {kbItems.length === 0 ? (
          <Card className="text-center py-10 shadow-md">
            <CardHeader>
                <AlertTriangle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <CardTitle>Knowledge Base is Empty</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Add content to your knowledge base to use the interactive tutor.
              </p>
              <Button asChild size="lg">
                <Link href="/knowledge-base/new">Add Content to Knowledge Base</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kbItems.map((item) => (
                <Card key={item.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                        <CardTitle className="text-xl font-headline mb-1">{item.documentName}</CardTitle>
                        {getIconForContent(item)}
                    </div>
                    <CardDescription className="text-xs">
                      Added: {format(new Date(item.createdAt), "PPp")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.summary}</p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleStartTutoring(item)} 
                      className="w-full"
                      disabled={processingItemId === item.id}
                    >
                      {processingItemId === item.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparing Session...
                        </>
                      ) : (
                        "Start Tutoring Session"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </ClientAuthGuard>
  );
}
