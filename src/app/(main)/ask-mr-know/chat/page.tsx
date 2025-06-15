
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getActiveAskMrKnowSession, setActiveAskMrKnowSession, type ActiveAskMrKnowSessionData, type AskMrKnowMessage } from '@/lib/session-store';
import { getNextAskMrKnowResponse } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MessageCircleQuestion, User, Bot, Send, Loader2, ArrowLeft, Home, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import NextImage from 'next/image'; 
import { cn } from '@/lib/utils';

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

export default function AskMrKnowChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<ActiveAskMrKnowSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = getActiveAskMrKnowSession();
    if (data && data.chatHistory) {
      setSessionData(data);
    } else {
      setError("No active chat session found or session is invalid. Please start a new session by selecting content.");
      setActiveAskMrKnowSession(null);
    }
    setIsLoading(false);
  }, []);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [sessionData?.chatHistory]);


  const handleEndSession = () => {
    setActiveAskMrKnowSession(null);
    router.push('/ask-mr-know/select');
  };

  const handleReturnToDashboard = () => {
    setActiveAskMrKnowSession(null);
    router.push('/dashboard');
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !sessionData) return;
    setIsSending(true);

    const newUserMessage: AskMrKnowMessage = {
      role: 'user',
      parts: [{ text: userMessage }],
      timestamp: new Date().toISOString(),
    };

    const updatedSessionWithUserMsg: ActiveAskMrKnowSessionData = {
      ...sessionData,
      chatHistory: [...sessionData.chatHistory, newUserMessage],
    };
    setSessionData(updatedSessionWithUserMsg);
    setActiveAskMrKnowSession(updatedSessionWithUserMsg);
    setUserMessage(""); 

    const aiResponse = await getNextAskMrKnowResponse(updatedSessionWithUserMsg, userMessage);
    setIsSending(false);

    if ('error' in aiResponse) {
      toast({ title: "StudyEthiopia AI+ Error", description: aiResponse.error, variant: "destructive" });
    } else {
      const updatedSessionWithAiMsg: ActiveAskMrKnowSessionData = {
        ...updatedSessionWithUserMsg,
        chatHistory: [...updatedSessionWithUserMsg.chatHistory, aiResponse],
      };
      setSessionData(updatedSessionWithAiMsg);
      setActiveAskMrKnowSession(updatedSessionWithAiMsg);
    }
  };


  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-20 w-full" />
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
              <p>{error || "Could not load chat session data."}</p>
              <Button onClick={() => router.push('/ask-mr-know/select')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Content Selection
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  const isMediaImage = sessionData.mediaDataUri?.startsWith('data:image');

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-3xl mx-auto shadow-xl flex flex-col flex-grow">
          <CardHeader className="text-center border-b">
            <MessageCircleQuestion className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl font-headline">Chat with StudyEthiopia AI+</CardTitle>
            <CardDescription>Chatting about: {sessionData.documentName}</CardDescription>
          </CardHeader>

          {isMediaImage && sessionData.mediaDataUri && (
            <CardContent className="p-4 border-b flex justify-center bg-muted/30 max-h-48 overflow-hidden">
                 <NextImage 
                    src={sessionData.mediaDataUri} 
                    alt="Context Media" 
                    width={200} 
                    height={150} 
                    className="rounded-md object-contain border"
                  />
            </CardContent>
          )}

          <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {sessionData.chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-end space-x-2",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === 'model' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Bot size={18}/></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "p-3 rounded-lg max-w-[70%]",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {msg.parts.map((part, partIdx) => (
                      <p key={partIdx} className="whitespace-pre-wrap text-sm">{part.text}</p>
                    ))}
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.timestamp), "p")}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                     <Avatar className="h-8 w-8">
                      <AvatarFallback><User size={18}/></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
               {isSending && (
                 <div className="flex items-end space-x-2 justify-start">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Bot size={18}/></AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg bg-muted text-muted-foreground max-w-[70%]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                 </div>
               )}
            </div>
          </ScrollArea>

          <CardFooter className="p-4 border-t">
            <div className="flex w-full items-center space-x-2">
              <Textarea
                placeholder="Ask StudyEthiopia AI+ about the content..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                className="min-h-[40px] max-h-[120px] resize-none flex-grow"
                disabled={isSending}
              />
              <Button onClick={handleSendMessage} disabled={isSending || !userMessage.trim()} size="icon">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 w-full max-w-3xl mx-auto">
            <Button onClick={handleEndSession} variant="secondary" size="lg" className="w-full sm:w-auto shadow-md">
                <ArrowLeft className="mr-2 h-5 w-5" /> End Chat
            </Button>
            <Button onClick={handleReturnToDashboard} variant="default" size="lg" className="w-full sm:w-auto shadow-md">
                 <Home className="mr-2 h-5 w-5" /> Dashboard
            </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}

