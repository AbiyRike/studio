
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { getActiveInteractiveTavusTutorSession, setActiveInteractiveTavusTutorSession, type ActiveInteractiveTavusTutorSessionData, type ChatHistoryMessage } from '@/lib/session-store';
import { getTavusTutorVideoResponse, endTavusTutorSession } from '@/app/actions'; 
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, GraduationCap, Loader2, ArrowLeft, Home, Send, Video as VideoIcon, Webcam, AlertCircle, MessageSquare } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
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

export default function InteractiveTavusTutorSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<ActiveInteractiveTavusTutorSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = getActiveInteractiveTavusTutorSession();
    if (data && data.conversationId) {
      setSessionData(data);
      setMessages(data.chatHistory || []);
      setCurrentVideoUrl(data.initialVideoUrl || null);
    } else {
      setError("No active video tutoring session found or session is invalid. Please start a new session.");
      setActiveInteractiveTavusTutorSession(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (videoPlayerRef.current && currentVideoUrl) {
      videoPlayerRef.current.load(); // Ensure new video loads
      videoPlayerRef.current.play().catch(e => console.warn("Video autoplay prevented:", e));
    }
  }, [currentVideoUrl]);

  const handleEndSession = async () => {
    if (sessionData?.conversationId) {
        const result = await endTavusTutorSession(sessionData.conversationId);
        if (result.success) {
            toast({ title: "Session Ended", description: result.message || "Video tutoring session ended." });
        } else {
            toast({ title: "Error Ending Session", description: result.error || "Could not formally end Tavus session.", variant: "destructive" });
        }
    }
    setActiveInteractiveTavusTutorSession(null);
    router.push('/interactive-tutor/select');
  };

  const handleReturnToDashboard = () => {
    setActiveInteractiveTavusTutorSession(null); // Optionally end session here too
    router.push('/dashboard');
  }

  const handleSendMessage = async () => {
    if (!userInput.trim() || !sessionData || !sessionData.conversationId) return;

    const newUserMessage: ChatHistoryMessage = {
      role: 'user',
      text: userInput,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMessage]);
    const currentInput = userInput;
    setUserInput("");
    setIsSendingMessage(true);

    const updatedChatHistory = [...messages, newUserMessage];

    const response = await getTavusTutorVideoResponse(
        sessionData,
        currentInput
    );
    setIsSendingMessage(false);

    if (response.error || !response.aiTextResponse) {
      toast({ title: "Tutor Response Error", description: response.error || "The tutor couldn't respond.", variant: "destructive" });
      setMessages(prev => [...prev, { role: 'model', text: response.error || "Sorry, I couldn't process that.", timestamp: new Date().toISOString() }]);
    } else {
      const aiMessage: ChatHistoryMessage = {
        role: 'model',
        text: response.aiTextResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setCurrentVideoUrl(response.videoUrl || null);
      
      const updatedSession: ActiveInteractiveTavusTutorSessionData = {
        ...sessionData,
        chatHistory: [...updatedChatHistory, aiMessage],
      };
      setSessionData(updatedSession);
      setActiveInteractiveTavusTutorSession(updatedSession);
    }
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-72 w-full max-w-2xl mx-auto" /> {/* Video placeholder */}
          <Skeleton className="h-32 w-full max-w-2xl mx-auto" /> {/* Chat placeholder */}
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
              <p>{error || "Could not load video tutoring session data."}</p>
              <Button onClick={() => router.push('/interactive-tutor/select')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientAuthGuard>
    );
  }
  
  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col items-center space-y-6 h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-3xl shadow-xl">
          <CardHeader className="text-center">
            <VideoIcon className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-headline">Interactive Video Tutor</CardTitle>
            <CardDescription>Learning about: {sessionData.documentName}</CardDescription>
          </CardHeader>
        </Card>

        <div className="w-full max-w-3xl flex flex-col lg:flex-row gap-6 flex-grow min-h-0">
          {/* Video Player Section */}
          <Card className="lg:w-1/2 shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">StudyEthiopia AI+ Avatar</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-2">
              {currentVideoUrl ? (
                <video 
                  ref={videoPlayerRef} 
                  key={currentVideoUrl} 
                  className="w-full h-auto max-h-[400px] rounded-md bg-muted" 
                  controls 
                  autoPlay 
                  playsInline
                  onEnded={() => console.log("Video finished")}
                >
                  <source src={currentVideoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="aspect-video w-full bg-muted rounded-md flex flex-col items-center justify-center text-muted-foreground">
                  <Webcam className="h-16 w-16 mb-2" />
                  <p>Tutor video will appear here.</p>
                   {isSendingMessage && <Loader2 className="h-8 w-8 animate-spin text-primary mt-2" />}
                </div>
              )}
            </CardContent>
             <CardFooter className="p-2 text-center">
              <p className="text-xs text-muted-foreground">
                This is a simulated video stream. Full Tavus SDK integration needed for real-time avatar.
              </p>
            </CardFooter>
          </Card>

          {/* Chat/Transcript Section */}
          <Card className="lg:w-1/2 shadow-lg flex flex-col flex-grow min-h-0">
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><MessageSquare className="mr-2"/> Conversation Transcript</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-grow p-4 border-t border-b" ref={chatContainerRef}>
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-end space-x-2",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === 'model' && (
                      <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "p-3 rounded-lg max-w-[85%] shadow-sm",
                        msg.role === 'user'
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">
                        {format(new Date(msg.timestamp), "p")}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                       <Avatar className="h-8 w-8">
                        <AvatarFallback>You</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                 {isSendingMessage && (
                   <div className="flex items-end space-x-2 justify-start">
                      <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className="p-3 rounded-lg bg-muted text-muted-foreground max-w-[70%]">
                          <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                   </div>
                 )}
              </div>
            </ScrollArea>
            <CardFooter className="p-4">
              <div className="flex w-full items-center space-x-2">
                <Textarea
                  placeholder="Ask your question or respond..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  className="min-h-[40px] max-h-[100px] resize-none flex-grow"
                  disabled={isSendingMessage || currentStep?.isLastStep}
                />
                <Button onClick={handleSendMessage} disabled={isSendingMessage || !userInput.trim() || currentStep?.isLastStep} size="icon">
                  {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-auto pt-4 w-full max-w-3xl">
            <Button onClick={handleEndSession} variant="secondary" size="lg" className="w-full sm:w-auto shadow-md">
                <ArrowLeft className="mr-2 h-5 w-5" /> End Session
            </Button>
            <Button onClick={handleReturnToDashboard} variant="default" size="lg" className="w-full sm:w-auto shadow-md">
                 <Home className="mr-2 h-5 w-5" /> Dashboard
            </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}
