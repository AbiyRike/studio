"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { processContentForTutor, type TutorSessionData } from "@/app/actions";
import { Loader2, FileText, Mic, Video } from 'lucide-react';
import { setTemporarySessionData } from '@/lib/session-store';

export function ContentUploader() {
  const [documentName, setDocumentName] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentName.trim() || !documentContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a document name and content.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const result = await processContentForTutor(documentName, documentContent);
    setIsLoading(false);

    if ('error' in result) {
      toast({
        title: "Error Processing Content",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setTemporarySessionData(result);
      toast({
        title: "Content Processed!",
        description: "Starting your learning session...",
      });
      router.push('/tutor');
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Start a New Learning Session</CardTitle>
        <CardDescription>
          Enter a name for your document and paste its content below. Or, use the (simulated) options to upload various file types.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="documentName" className="text-lg">Document Name</Label>
            <Input
              id="documentName"
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., Photosynthesis Basics"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="documentContent" className="text-lg">Document Content</Label>
            <Textarea
              id="documentContent"
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              placeholder="Paste your document text here..."
              className="mt-1 min-h-[200px] text-sm"
              required
            />
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Or (simulated) upload from:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button type="button" variant="outline" disabled={isLoading} onClick={() => toast({ title: "Feature Coming Soon", description: "PDF upload is not yet implemented."})}>
                <FileText className="mr-2 h-5 w-5" /> Upload PDF
              </Button>
              <Button type="button" variant="outline" disabled={isLoading} onClick={() => toast({ title: "Feature Coming Soon", description: "Microphone input is not yet implemented."})}>
                <Mic className="mr-2 h-5 w-5" /> Use Microphone
              </Button>
              <Button type="button" variant="outline" disabled={isLoading} onClick={() => toast({ title: "Feature Coming Soon", description: "Camera input is not yet implemented."})}>
                <Video className="mr-2 h-5 w-5" /> Use Camera
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              "Start Tutoring Session"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
