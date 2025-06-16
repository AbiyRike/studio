
"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getKnowledgeBaseItemById, addKnowledgeBaseItem, type KnowledgeBaseItem } from '@/lib/knowledge-base-store';
import { updateKnowledgeItemDetails } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Save, Loader2 } from 'lucide-react';
import NextImage from 'next/image';

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

export default function EditKnowledgeItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [item, setItem] = useState<KnowledgeBaseItem | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchedItem = getKnowledgeBaseItemById(id);
      if (fetchedItem) {
        setItem(fetchedItem);
        setDocumentName(fetchedItem.documentName);
        setDocumentContent(fetchedItem.documentContent);
      } else {
        setError("Knowledge base item not found.");
      }
    } else {
      setError("No item ID provided.");
    }
    setIsLoading(false);
  }, [id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;

    setIsSaving(true);
    const result = await updateKnowledgeItemDetails({
      id: item.id,
      documentName: documentName,
      documentContent: documentContent,
      mediaDataUri: item.mediaDataUri, // Pass existing media URI
      createdAt: item.createdAt,     // Pass existing createdAt
    });
    setIsSaving(false);

    if ('error' in result) {
      toast({
        title: "Error Updating Item",
        description: result.error,
        variant: "destructive",
      });
    } else {
      addKnowledgeBaseItem(result); // This will update or add the item
      toast({
        title: "Item Updated",
        description: `"${result.documentName}" has been successfully updated.`,
      });
      // Dispatch an event to notify other components (like manage page) to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('knowledgeBaseUpdated'));
      }
      router.push('/knowledge-base/manage');
    }
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-24 w-full" />
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
              <p>{error || "Could not load knowledge base item for editing."}</p>
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
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancel Edit
        </Button>

        <Card className="w-full max-w-3xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Edit: {item.documentName}</CardTitle>
            <CardDescription>Modify the details of your knowledge base item. The summary will be re-generated upon saving.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="documentName" className="text-base">Document Name</Label>
                <Input
                  id="documentName"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="mt-1 text-base"
                  required
                  disabled={isSaving}
                />
              </div>

              {isMediaImage && item.mediaDataUri && (
                <div className="space-y-2">
                  <Label className="text-base">Associated Media (Not Editable)</Label>
                  <div className="flex justify-center p-2 border rounded-md bg-muted/30">
                    <NextImage 
                      src={item.mediaDataUri} 
                      alt="Associated media" 
                      width={200} 
                      height={150} 
                      className="rounded-md object-contain border"
                      data-ai-hint="document media"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="documentContent" className="text-base">Document Content</Label>
                <Textarea
                  id="documentContent"
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="Enter the full text content here..."
                  className="mt-1 min-h-[250px] text-base"
                  required
                  disabled={isSaving}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-3 p-6">
              <Button type="button" variant="outline" onClick={() => router.push('/knowledge-base/manage')} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !documentName.trim() || !documentContent.trim()}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ClientAuthGuard>
  );
}
