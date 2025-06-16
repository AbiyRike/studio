"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getKnowledgeBaseItems, deleteKnowledgeBaseItem, type KnowledgeBaseItem } from '@/lib/knowledge-base-store';
import { useToast } from "@/hooks/use-toast";
import { FolderKanban, PlusCircle, FileText, Image as ImageIcon, Mic, Trash2, Eye, Edit, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export default function ManageKnowledgeBasePage() {
  const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const loadItems = () => {
    setKbItems(getKnowledgeBaseItems());
  };

  useEffect(() => {
    loadItems();
    setIsLoading(false);
  }, []);

  const handleDeleteItem = (id: string, name: string) => {
    deleteKnowledgeBaseItem(id);
    loadItems(); // Refresh the list
    toast({
      title: "Item Deleted",
      description: `"${name}" has been removed from your knowledge base.`,
    });
  };

  const handleEditItem = (id: string) => {
    // For now, this is a placeholder.
    // In a full implementation, this would navigate to an edit page or open a modal.
    // router.push(`/knowledge-base/edit/${id}`); 
    toast({
      title: "Edit Not Implemented",
      description: "Editing knowledge base items will be available in a future update.",
      variant: "default"
    });
  };
  
  const getIconForContent = (item: KnowledgeBaseItem) => {
    if (item.mediaDataUri?.startsWith('data:image')) {
      return <ImageIcon className="h-5 w-5 text-accent flex-shrink-0" />;
    }
    if (item.documentName.toLowerCase().includes('audio') || (item.documentContent || "").toLowerCase().includes('audio recording')) {
      return <Mic className="h-5 w-5 text-accent flex-shrink-0" />;
    }
    return <FileText className="h-5 w-5 text-accent flex-shrink-0" />;
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold font-headline">Manage Knowledge Base</h1>
            <Button><PlusCircle className="mr-2 h-5 w-5" /> Add New Content</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-6 bg-muted rounded w-3/4"></div></CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-10 bg-muted rounded w-full"></div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <div className="h-8 w-8 bg-muted rounded"></div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </CardFooter>
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
            <FolderKanban className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold font-headline">Your Knowledge Base</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              View, manage, and add new content to your personal learning repository.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild size="lg">
              <Link href="/knowledge-base/new">
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Content
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {kbItems.length === 0 ? (
          <Card className="text-center py-16 shadow-md">
             <CardHeader>
                <AlertTriangle className="mx-auto h-20 w-20 text-muted-foreground mb-4" />
                <CardTitle className="text-2xl">Your Knowledge Base is Empty</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6 text-lg">
                Start building your knowledge by adding documents, notes, or media.
              </p>
              <Button asChild size="lg" className="text-base py-3 px-6">
                <Link href="/knowledge-base/new">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Item
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kbItems.map((item) => (
                <Card key={item.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <CardTitle className="text-xl font-headline mb-1 line-clamp-2 leading-tight">{item.documentName}</CardTitle>
                        {getIconForContent(item)}
                    </div>
                    <CardDescription className="text-xs">
                      Added: {format(new Date(item.createdAt), "PPp")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow pt-0 pb-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.summary || "No summary available."}</p>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 p-3 border-t">
                    <Button variant="ghost" size="icon" asChild title="View">
                      <Link href={`/knowledge-base/view/${item.id}`}><Eye className="h-5 w-5" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit (Coming Soon)" onClick={() => handleEditItem(item.id)}>
                      <Edit className="h-5 w-5" />
                    </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Delete" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete
                            "{item.documentName}" from your knowledge base.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteItem(item.id, item.documentName)} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete it
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
