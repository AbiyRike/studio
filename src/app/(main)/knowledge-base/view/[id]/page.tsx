"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getKnowledgeBaseItemById, type KnowledgeBaseItem } from '@/lib/knowledge-base-store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Download, FileText, Image as ImageIcon, Mic } from 'lucide-react';
import NextImage from 'next/image'; // Use NextImage for optimized images
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

  if (!isVerified) return null;
  return <>{children}</>;
};

export default function ViewKnowledgeItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<KnowledgeBaseItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchedItem = getKnowledgeBaseItemById(id);
      if (fetchedItem) {
        setItem(fetchedItem);
      } else {
        setError("Knowledge base item not found.");
      }
    } else {
      setError("No item ID provided.");
    }
    setIsLoading(false);
  }, [id]);

  const handleDownloadText = () => {
    if (!item) return;
    const content = `Document Name: ${item.documentName}\n\nSummary:\n${item.summary}\n\nFull Content:\n${item.documentContent}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${item.documentName.replace(/[^a-zA-Z0-9]/g, '_')}_content.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  
  const getIconForContent = (kbItem: KnowledgeBaseItem | null) => {
    if (!kbItem) return <FileText className="h-8 w-8 text-primary" />;
    if (kbItem.mediaDataUri?.startsWith('data:image')) {
      return <ImageIcon className="h-8 w-8 text-primary" />;
    }
    if (kbItem.documentName.toLowerCase().includes('audio') || (kbItem.documentContent || "").toLowerCase().includes('audio recording')) {
      return <Mic className="h-8 w-8 text-primary" />;
    }
    return <FileText className="h-8 w-8 text-primary" />;
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      </ClientAuthGuard>
    );
  }

  if (error || !item) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive mt-2">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || "Could not load knowledge base item."}</p>
              <Button onClick={() => router.push('/knowledge-base/manage')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Knowledge Base
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }

  const isMediaImage = item.mediaDataUri?.startsWith('data:image');

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8">
        <Button variant="outline" onClick={() => router.push('/knowledge-base/manage')} className="mb-6 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Knowledge Base
        </Button>

        <Card className="w-full max-w-4xl mx-auto shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/30 p-6 border-b">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 pt-1">
                {getIconForContent(item)}
              </div>
              <div>
                <CardTitle className="text-3xl font-headline mb-1">{item.documentName}</CardTitle>
                <CardDescription className="text-sm">
                  Added: {format(new Date(item.createdAt), "PPPp")} | Last Updated: {format(new Date(item.updatedAt), "PPPp")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {isMediaImage && item.mediaDataUri && (
              <div className="my-4 p-4 border rounded-lg bg-background shadow-inner">
                <h3 className="text-xl font-semibold mb-3 font-headline text-primary">Associated Media</h3>
                <div className="flex justify-center items-center max-h-96 overflow-hidden rounded-md">
                  <NextImage 
                    src={item.mediaDataUri} 
                    alt={`Media for ${item.documentName}`} 
                    width={600} 
                    height={400} 
                    className="rounded-md object-contain border"
                    data-ai-hint="document content image" 
                  />
                </div>
              </div>
            )}

            {item.summary && (
              <div className="p-4 border rounded-lg bg-background shadow-inner">
                <h3 className="text-xl font-semibold mb-2 font-headline text-primary">Summary</h3>
                <p className="text-foreground/90 whitespace-pre-line leading-relaxed">{item.summary}</p>
              </div>
            )}

            {item.documentContent && (
              <div className="p-4 border rounded-lg bg-background shadow-inner">
                <h3 className="text-xl font-semibold mb-2 font-headline text-primary">Full Content</h3>
                <ScrollArea className="h-[400px] w-full rounded-md p-1">
                  <pre className="text-sm text-foreground/80 whitespace-pre-wrap break-words leading-relaxed p-3 bg-muted/30 rounded-md">
                    {item.documentContent}
                  </pre>
                </ScrollArea>
              </div>
            )}
            
            {!item.documentContent && !item.mediaDataUri && !item.summary && (
                <p className="text-muted-foreground text-center py-8">This knowledge base item seems to be empty.</p>
            )}

          </CardContent>
          <CardFooter className="p-6 border-t bg-muted/30 flex justify-end">
            <Button onClick={handleDownloadText} disabled={!item.documentContent && !item.summary}>
              <Download className="mr-2 h-4 w-4" /> Download as Text
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientAuthGuard>
  );
}
