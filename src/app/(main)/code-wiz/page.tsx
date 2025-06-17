
"use client";

import { useEffect, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { setActiveCodeWizSession, type ActiveCodeWizSessionData } from '@/lib/session-store';
import { fetchCodeFromUrlAction } from '@/app/actions';
import { Wand2, Loader2, UploadCloud, Link as LinkIcon, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { generateId } from '@/lib/knowledge-base-store';

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

const MAX_CODE_LENGTH = 200000; // Max 200KB of code

export default function CodeWizInputPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("paste");
  const [pastedCode, setPastedCode] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [codeUrl, setCodeUrl] = useState("");
  const [languageHint, setLanguageHint] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_CODE_LENGTH) {
        toast({
          title: "File Too Large",
          description: `Please select a code file smaller than ${MAX_CODE_LENGTH / 1000}KB.`,
          variant: "destructive",
        });
        event.target.value = ""; // Reset file input
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setFileContent(text);
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension) setLanguageHint(extension); // Auto-fill language hint from extension
      };
      reader.readAsText(file);
    }
  };

  const handleProceed = async () => {
    let codeToProcess = "";
    let finalLanguageHint = languageHint.trim();

    setIsLoading(true);

    if (activeTab === "paste") {
      codeToProcess = pastedCode;
    } else if (activeTab === "upload") {
      codeToProcess = fileContent;
    } else if (activeTab === "url") {
      if (!codeUrl.trim()) {
        toast({ title: "URL Required", description: "Please enter a valid URL.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const result = await fetchCodeFromUrlAction(codeUrl);
      if ('error' in result) {
        toast({ title: "Error Fetching Code", description: result.error, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      codeToProcess = result.code;
      // Try to get lang from URL extension
      try {
          const urlPath = new URL(codeUrl).pathname;
          const urlExt = urlPath.split('.').pop()?.toLowerCase();
          if (urlExt && !finalLanguageHint) finalLanguageHint = urlExt;
      } catch (e) { /* ignore invalid URL for extension parsing */ }

    }

    if (!codeToProcess.trim()) {
      toast({ title: "No Code Provided", description: "Please paste, upload, or provide a URL for some code.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (codeToProcess.length > MAX_CODE_LENGTH) {
        toast({ title: "Code Too Long", description: `The provided code exceeds the ${MAX_CODE_LENGTH/1000}KB limit. Please use shorter code.`, variant: "destructive" });
        setIsLoading(false);
        return;
    }

    const sessionData: ActiveCodeWizSessionData = {
      id: `cw_${generateId()}`,
      originalCode: codeToProcess,
      languageHint: finalLanguageHint || undefined,
      isLoadingAi: false,
      isTtsMuted: false,
      createdAt: new Date().toISOString(),
    };

    setActiveCodeWizSession(sessionData);
    toast({ title: "Code Wiz Ready!", description: "Navigating to analysis session..." });
    router.push('/code-wiz/session');
    // setIsLoading(false); // Navigation will unmount
  };

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-3xl mx-auto shadow-xl">
          <CardHeader className="text-center">
            <Wand2 className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold font-headline">Code Wiz</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Provide your code snippet or file to get AI-powered analysis, explanations, and optimizations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="paste"><FileText className="mr-2 h-4 w-4" />Paste Code</TabsTrigger>
                <TabsTrigger value="upload"><UploadCloud className="mr-2 h-4 w-4" />Upload File</TabsTrigger>
                <TabsTrigger value="url"><LinkIcon className="mr-2 h-4 w-4" />From URL</TabsTrigger>
              </TabsList>
              <TabsContent value="paste" className="mt-6">
                <Label htmlFor="pastedCode" className="text-base">Paste your code here:</Label>
                <Textarea
                  id="pastedCode"
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  placeholder="function example() { console.log('Hello, Code Wiz!'); }"
                  className="mt-1 min-h-[200px] font-code text-sm"
                  disabled={isLoading}
                />
              </TabsContent>
              <TabsContent value="upload" className="mt-6 space-y-3">
                <Label htmlFor="fileUpload" className="text-base">Upload a code file (e.g., .js, .py, .java, .html):</Label>
                <Input
                  id="fileUpload"
                  type="file"
                  onChange={handleFileChange}
                  className="mt-1"
                  accept=".*" // Allow any file extension, validation is on content
                  disabled={isLoading}
                />
                {fileName && <p className="text-sm text-muted-foreground">Selected file: {fileName}</p>}
                {fileContent && <p className="text-xs text-green-600">File content loaded.</p>}
              </TabsContent>
              <TabsContent value="url" className="mt-6 space-y-3">
                <Label htmlFor="codeUrl" className="text-base">Enter URL to a raw code file (e.g., GitHub raw link):</Label>
                <Input
                  id="codeUrl"
                  type="url"
                  value={codeUrl}
                  onChange={(e) => setCodeUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/user/repo/main/file.js"
                  className="mt-1"
                  disabled={isLoading}
                />
              </TabsContent>
            </Tabs>

            <div className="mt-4">
              <Label htmlFor="languageHint" className="text-base">Programming Language (Optional Hint)</Label>
              <Input
                id="languageHint"
                type="text"
                value={languageHint}
                onChange={(e) => setLanguageHint(e.target.value)}
                placeholder="e.g., javascript, python, java (helps AI)"
                className="mt-1"
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4">
             <Alert variant="default" className="bg-primary/10 border-primary/30 text-primary-foreground">
              <Sparkles className="h-5 w-5 !text-primary" />
              <AlertTitle className="font-semibold !text-primary">Tip!</AlertTitle>
              <AlertDescription className="!text-primary/90">
                For best results, provide a language hint if it's not obvious from the file extension (for uploads/URLs).
              </AlertDescription>
            </Alert>
            <Button onClick={handleProceed} className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing Code...</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> Start Code Wiz Session</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientAuthGuard>
  );
}
