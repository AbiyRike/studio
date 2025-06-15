
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GraduationCap, ArrowLeft, Home, User, Bot, Send, Loader2, Video, Webcam, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { initiateTavusLiveSession, type TavusConversationDetails } from '@/app/actions';
import NextImage from 'next/image';


const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [isVerified, setIsVerified] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('isLoggedIn')) {
        redirect('/login');
      } else {
        setIsVerified(true);
      }
    }
  }, []);

  if (!isVerified) return null;
  return <>{children}</>;
};

const TAVUS_PERSONA_ID_EMMA_WILSON = "pc55154f229a"; // Provided persona ID

export default function LiveTutorPage() {
  const { toast } = useToast();
  const [isSessionStarting, setIsSessionStarting] = useState(false);
  const [tavusSessionDetails, setTavusSessionDetails] = useState<TavusConversationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  // User and AI messages for chat display (conceptual)
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [userInput, setUserInput] = useState("");


  const handleStartSession = async () => {
    setIsSessionStarting(true);
    setError(null);
    setTavusSessionDetails(null);
    setShowInstructions(false);

    const result = await initiateTavusLiveSession(TAVUS_PERSONA_ID_EMMA_WILSON);

    setIsSessionStarting(false);
    if ('error' in result) {
      setError(result.error);
      toast({
        title: "Error Starting Live Session",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setTavusSessionDetails(result);
      toast({
        title: "Live Session Initiated (Simulated)",
        description: `Conversation ID: ${result.conversation_id}. Ready for Tavus SDK integration.`,
      });
      // In a real app, you'd now use result.client_secret with the Tavus SDK
      // to connect to the video stream and messaging.
      setMessages([{ sender: 'ai', text: "Hello! I'm Emma Wilson, your US History tutor. What period or event in American history are you curious about today?" }]);
    }
  };
  
  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    setMessages(prev => [...prev, { sender: 'user', text: userInput }]);
    // Simulate AI response after a delay for placeholder
    setTimeout(() => {
        setMessages(prev => [...prev, {sender: 'ai', text: "That's an interesting question! Let's explore that. (This is a simulated response - Tavus SDK needed for actual interaction)"}]);
    }, 1000);
    setUserInput("");
    // In real integration, send userInput to Tavus via SDK
  }

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col items-center space-y-6">
        <Card className="w-full max-w-3xl shadow-xl">
          <CardHeader className="text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-headline">Live AI Tutor</CardTitle>
            <CardDescription>
              Interact with Emma Wilson, your AI US History Teacher, via live video.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="w-full max-w-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground mb-4">
              {isSessionStarting ? (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              ) : tavusSessionDetails ? (
                <div className="text-center">
                   <Webcam className="h-16 w-16 mx-auto mb-2 text-green-500" />
                  <p className="font-semibold">Live Avatar Feed Would Display Here</p>
                  <p className="text-xs">(Tavus SDK Integration Required)</p>
                  <p className="text-xs mt-1">Conv. ID: {tavusSessionDetails.conversation_id}</p>
                </div>
              ) : error ? (
                 <div className="text-center text-destructive p-4">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2"/>
                    <p className="font-semibold">Could not start session:</p>
                    <p className="text-sm">{error}</p>
                 </div>
              ) : (
                <div className="text-center">
                    <Video className="h-16 w-16 mx-auto mb-2" />
                    <p>Your live video tutor will appear here once the session starts.</p>
                </div>
              )}
            </div>

            {!tavusSessionDetails && !isSessionStarting && showInstructions && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Ready to Learn?</AlertTitle>
                    <AlertDescription>
                        Click "Start Live Session" to connect with Emma Wilson. This will simulate initiating a session with the Tavus API.
                        Full video and audio interaction requires the Tavus SDK.
                    </AlertDescription>
                </Alert>
            )}
            
            {tavusSessionDetails && (
                <div className="mt-4 border rounded-md p-4 h-64 overflow-y-auto flex flex-col space-y-2 bg-background">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-2 rounded-lg max-w-[70%] ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {tavusSessionDetails && (
                <div className="mt-4 flex items-center space-x-2">
                    <Input 
                        type="text" 
                        value={userInput} 
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ask Emma a question about US History..." 
                        className="flex-grow"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                    />
                    <Button onClick={handleSendMessage} size="icon" disabled={!userInput.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            )}

          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
            {!tavusSessionDetails && (
              <Button onClick={handleStartSession} disabled={isSessionStarting} size="lg" className="w-full sm:w-auto">
                {isSessionStarting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Webcam className="mr-2 h-5 w-5" />}
                {isSessionStarting ? "Starting Session..." : "Start Live Session with Emma"}
              </Button>
            )}
             <Button variant="outline" onClick={() => router.push('/dashboard')} size="lg" className="w-full sm:w-auto">
                <Home className="mr-2 h-5 w-5" /> Dashboard
             </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientAuthGuard>
  );
}
