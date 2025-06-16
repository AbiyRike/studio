
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getKnowledgeBaseItemById, type KnowledgeBaseItem } from '@/lib/knowledge-base-store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Download, FileText, Image as ImageIcon, Mic, Loader2 } from 'lucide-react';
import NextImage from 'next/image'; 
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';

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
  const { toast } = useToast();

  const [item, setItem] = useState<KnowledgeBaseItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
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

  const handleDownloadPdf = () => {
    if (!item) return;
    setIsDownloadingPdf(true);
    toast({
      title: "Generating PDF...",
      description: "Please wait while the PDF is being prepared.",
    });

    const element = document.getElementById('printable-content-area');
    if (element) {
      const opt = {
        margin:       [0.5, 0.5, 0.5, 0.5], // top, left, bottom, right
        filename:     `${item.documentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.95 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf().from(element).set(opt).save().then(() => {
        setIsDownloadingPdf(false);
        toast({
          title: "PDF Downloaded",
          description: `"${item.documentName}.pdf" has been saved.`,
        });
      }).catch(err => {
        setIsDownloadingPdf(false);
        console.error("Error generating PDF:", err);
        toast({
          title: "PDF Generation Failed",
          description: "Could not generate PDF. Please try again.",
          variant: "destructive",
        });
      });

    } else {
      setIsDownloadingPdf(false);
      toast({
        title: "Error",
        description: "Could not find content to print.",
        variant: "destructive",
      });
    }
  };
  
  const getIconForContent = (kbItem: KnowledgeBaseItem | null) => {
    if (!kbItem) return <FileText className="h-10 w-10 text-primary" />;
    if (kbItem.mediaDataUri?.startsWith('data:image')) {
      return <ImageIcon className="h-10 w-10 text-primary" />;
    }
    if (kbItem.documentName.toLowerCase().includes('audio') || (kbItem.documentContent || "").toLowerCase().includes('audio recording')) {
      return <Mic className="h-10 w-10 text-primary" />;
    }
    return <FileText className="h-10 w-10 text-primary" />;
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-16 w-3/4" /> {/* For Hero Title */}
          <Skeleton className="h-48 w-full" /> {/* For Image */}
          <Skeleton className="h-24 w-full" /> {/* For Summary */}
          <Skeleton className="h-64 w-full" /> {/* For Full Content */}
          <Skeleton className="h-10 w-1/3" /> {/* For Button */}
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

        <div id="printable-content-area" className="bg-card p-6 sm:p-8 md:p-10 rounded-lg shadow-xl">
          {/* Hero Title Section */}
          <div className="mb-8 pb-6 border-b border-border">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
                {getIconForContent(item)}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-headline text-primary break-words">
                  {item.documentName}
                </h1>
                <CardDescription className="text-sm mt-2">
                  Added: {format(new Date(item.createdAt), "PPPp")} | Last Updated: {format(new Date(item.updatedAt), "PPPp")}
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Main Content Section */}
          <div className="space-y-8">
            {isMediaImage && item.mediaDataUri && (
              <section className="mb-6">
                <h2 className="text-2xl font-semibold font-headline mb-4 text-foreground">Associated Media</h2>
                <div className="flex justify-center items-center p-4 border rounded-lg bg-muted/30 shadow-inner">
                  <NextImage 
                    src={item.mediaDataUri} 
                    alt={`Media for ${item.documentName}`} 
                    width={700} // Increased size
                    height={500} // Increased size
                    className="rounded-md object-contain border"
                    data-ai-hint="illustration concept" 
                  />
                </div>
              </section>
            )}

            {item.summary && (
              <section className="mb-6">
                <h2 className="text-2xl font-semibold font-headline mb-3 text-foreground">Summary</h2>
                <div className="prose prose-lg dark:prose-invert max-w-none bg-background p-4 rounded-md shadow-sm border">
                  {item.summary.split('\n').map((paragraph, index) => (
                    <p key={`summary-p-${index}`} className="mb-3 last:mb-0 leading-relaxed text-foreground/90">{paragraph}</p>
                  ))}
                </div>
              </section>
            )}

            {item.documentContent && (
              <section>
                <h2 className="text-2xl font-semibold font-headline mb-3 text-foreground">Full Content</h2>
                <ScrollArea className="h-auto max-h-[600px] w-full rounded-md border shadow-sm">
                  <div className="prose prose-base dark:prose-invert max-w-none p-6 bg-background leading-relaxed">
                    {item.documentContent.split('\n\n').map((paragraphBlock, index) => (
                      <div key={`content-block-${index}`} className="mb-4">
                        {paragraphBlock.split('\n').map((paragraph, pIndex) => (
                           <p key={`content-p-${index}-${pIndex}`} className="mb-2 last:mb-0 text-foreground/80">{paragraph}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </section>
            )}
            
            {!item.documentContent && !item.mediaDataUri && !item.summary && (
                <p className="text-muted-foreground text-center py-10 text-lg">This knowledge base item appears to be empty.</p>
            )}
          </div>
        </div>

        <CardFooter className="mt-8 p-6 border-t bg-muted/20 rounded-b-lg flex justify-end">
          <Button onClick={handleDownloadPdf} disabled={isDownloadingPdf} size="lg">
            {isDownloadingPdf ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating PDF...</>
            ) : (
              <><Download className="mr-2 h-5 w-5" /> Download as PDF</>
            )}
          </Button>
        </CardFooter>
      </div>
    </ClientAuthGuard>
  );
}
