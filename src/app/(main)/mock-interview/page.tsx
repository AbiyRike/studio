
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GraduationCap, Home, Send, Loader2, Video, Webcam, AlertCircle, Briefcase } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { initiateTavusLiveSession, type TavusConversationDetails } from '@/app/actions';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('isLoggedIn')) {
        router.push('/login'); // Use router.push for client-side navigation
      } else {
        setIsVerified(true);
      }
    }
  }, [router]);

  if (!isVerified) return null;
  return <>{children}</>;
};

const TAVUS_PERSONA_ID_JANE_SMITH = "pc55154f229a";

export default function MockInterviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSessionStarting, setIsSessionStarting] = useState(false);
  const [tavusSessionDetails, setTavusSessionDetails] = useState<TavusConversationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [userInput, setUserInput] = useState("");

  const handleStartSession = async () => {
    setIsSessionStarting(true);
    setError(null);
    setTavusSessionDetails(null);
    setShowInstructions(false);

    const result = await initiateTavusLiveSession(TAVUS_PERSONA_ID_JANE_SMITH);

    setIsSessionStarting(false);
    if ('error' in result) {
      setError(result.error);
      toast({
        title: "Error Starting Mock Interview",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setTavusSessionDetails(result);
      toast({
        title: "Mock Interview Session Initiated (Simulated)",
        description: `Conversation ID: ${result.conversation_id}. Ready for Tavus SDK integration.`,
      });
      // Initial message from Jane Smith
      setMessages([{ sender: 'ai', text: "Hi there, I'm Jane Smith, a Principal at Morrison & Blackwell. It's great to connect with you today. Before we dive into the case, could you tell me a little bit about your background and what brings you to Morrison & Blackwell?" }]);
    }
  };
  
  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    setMessages(prev => [...prev, { sender: 'user', text: userInput }]);
    // Simulate AI response
    setTimeout(() => {
        setMessages(prev => [...prev, {sender: 'ai', text: "That's interesting. Let's move on to the case. (This is a simulated response from Jane - Tavus SDK needed for actual interaction)"}]);
    }, 1000);
    setUserInput("");
    // In real integration, send userInput to Tavus via SDK
  };

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 flex flex-col items-center space-y-6">
        <Card className="w-full max-w-3xl shadow-xl">
          <CardHeader className="text-center">
            <Briefcase className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-headline">Mock Case Interview</CardTitle>
            <CardDescription>
              Practice with Jane Smith, your AI Case Interviewer from Morrison & Blackwell.
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
                  <p className="font-semibold">Live Avatar Feed (Jane Smith) Would Display Here</p>
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
                    <p>Jane Smith will appear here once the interview starts.</p>
                </div>
              )}
            </div>

            {!tavusSessionDetails && !isSessionStarting && showInstructions && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Ready for your Mock Interview?</AlertTitle>
                    <AlertDescription>
                        Click "Start Mock Interview" to connect with Jane Smith. This simulates initiating a session with the Tavus API.
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
                        placeholder="Respond to Jane..." 
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
                {isSessionStarting ? "Starting Interview..." : "Start Mock Interview with Jane"}
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

    