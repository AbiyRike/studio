
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setActiveCodeTeachingSession } from '@/lib/session-store';
import { getProgrammingLanguages, startCodeTeachingSession } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Code2, Loader2, AlertTriangle, Binary, Palette } from 'lucide-react';

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

type Category = "frontend" | "backend";

export default function SelectCodeLanguagePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleCategorySelect = async (category: Category) => {
    setSelectedCategory(category);
    setSelectedLanguage(null);
    setLanguages([]);
    setIsLoadingLanguages(true);
    const result = await getProgrammingLanguages({ category });
    setIsLoadingLanguages(false);
    if ('error' in result) {
      toast({ title: "Error fetching languages", description: result.error, variant: "destructive" });
    } else {
      setLanguages(result.languages || []);
      if ((result.languages || []).length === 0) {
        toast({ title: "No languages found", description: `Could not fetch languages for ${category}.`, variant: "default" });
      }
    }
  };

  const handleStartSession = async () => {
    if (!selectedLanguage) {
      toast({ title: "No Language Selected", description: "Please select a language to start learning.", variant: "destructive" });
      return;
    }
    setIsStartingSession(true);
    setActiveCodeTeachingSession(null);

    const result = await startCodeTeachingSession({ language: selectedLanguage });
    setIsStartingSession(false);

    if ('error' in result) {
      toast({ title: "Error Starting Session", description: result.error, variant: "destructive" });
    } else {
      setActiveCodeTeachingSession(result);
      toast({ title: "Session Started!", description: `Let's learn ${selectedLanguage}!` });
      router.push('/code-with-me/session');
    }
  };

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8">
        <Card className="mb-8 shadow-lg">
          <CardHeader className="text-center">
            <Code2 className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold font-headline">Code with Me: Select Language</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Choose your learning path and language to begin your interactive coding journey.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="w-full max-w-2xl mx-auto shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">1. Choose Your Path</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => handleCategorySelect("frontend")}
              variant={selectedCategory === "frontend" ? "default" : "outline"}
              className="w-full text-lg py-6"
              disabled={isLoadingLanguages}
            >
              <Palette className="mr-2 h-5 w-5" /> Frontend
            </Button>
            <Button
              onClick={() => handleCategorySelect("backend")}
              variant={selectedCategory === "backend" ? "default" : "outline"}
              className="w-full text-lg py-6"
              disabled={isLoadingLanguages}
            >
              <Binary className="mr-2 h-5 w-5" /> Backend
            </Button>
          </CardContent>

          {selectedCategory && (
            <>
              <CardHeader>
                <CardTitle className="text-xl">2. Select Language</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLanguages ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Fetching languages...</p>
                  </div>
                ) : languages.length > 0 ? (
                  <Select onValueChange={setSelectedLanguage} value={selectedLanguage || undefined}>
                    <SelectTrigger className="w-full text-lg py-6">
                      <SelectValue placeholder="-- Select a language --" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang} className="text-md">
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-muted-foreground">No languages available for this category, or an error occurred.</p>
                )}
              </CardContent>
            </>
          )}

          {selectedLanguage && (
            <CardFooter>
              <Button
                onClick={handleStartSession}
                className="w-full text-lg py-6"
                disabled={isStartingSession || isLoadingLanguages}
              >
                {isStartingSession ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting Session...</>
                ) : (
                  `Start Learning ${selectedLanguage}`
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </ClientAuthGuard>
  );
}
