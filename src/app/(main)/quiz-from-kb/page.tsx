
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getKnowledgeBaseItems, type KnowledgeBaseItem } from '@/lib/knowledge-base-store';
import { setActiveTutorSession } from '@/lib/session-store';
import { generateQuizSessionFromKBItem, type GenerateQuizFromKBItemInput } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2, AlertTriangle, FileText, Image as ImageIcon, Mic } from 'lucide-react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};

export default function QuizFromKnowledgeBasePage() {
  const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setKbItems(getKnowledgeBaseItems());
    setIsLoading(false);
  }, []);

  const handleStartQuiz = async (item: KnowledgeBaseItem) => {
    setProcessingItemId(item.id);
    setActiveTutorSession(null); // Clear previous active session

    const input: GenerateQuizFromKBItemInput = {
      documentName: item.documentName,
      documentContent: item.documentContent,
      mediaDataUri: item.mediaDataUri,
      summary: item.summary,
    };

    const result = await generateQuizSessionFromKBItem(input);
    setProcessingItemId(null);

    if ('error' in result) {
      toast({
        title: "Error Starting Quiz",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setActiveTutorSession(result);
      toast({
        title: "Quiz Ready!",
        description: `Starting quiz for "${item.documentName}".`,
      });
      router.push('/tutor');
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
          <h1 className="text-3xl font-bold font-headline mb-8 text-center">Select Content for Quiz</h1>
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
            <BookOpen className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold font-headline">Quiz from Your Knowledge Base</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Select a previously saved item to start a quiz.
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
                You haven't added any content to your knowledge base yet.
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
                      onClick={() => handleStartQuiz(item)} 
                      className="w-full"
                      disabled={processingItemId === item.id}
                    >
                      {processingItemId === item.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparing Quiz...
                        </>
                      ) : (
                        "Start Quiz"
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
