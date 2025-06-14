
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getLearningHistory, type HistoryItem } from '@/lib/session-store';
import { Brain, Layers, UserCircle, TrendingUp, BookCopy, Target, AlertTriangle, PieChart, CheckSquare, Activity, DatabaseZap, Edit3 } from 'lucide-react';
import { redirect } from 'next/navigation';
import Image from 'next/image';

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  if (typeof window !== 'undefined' && !localStorage.getItem('isLoggedIn')) {
    redirect('/login');
  }
  return <>{children}</>;
};

interface Metrics {
  overallAccuracy: number;
  quizzesTaken: number;
  topicsStudied: string[];
  averageScore: number;
}

export default function NewDashboardPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    overallAccuracy: 0,
    quizzesTaken: 0,
    topicsStudied: [],
    averageScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadedHistory = getLearningHistory();
    setHistory(loadedHistory);

    if (loadedHistory.length > 0) {
      let totalCorrectAnswers = 0;
      let totalQuestionsAttemptedInHistory = 0;
      
      loadedHistory.forEach(item => {
        totalCorrectAnswers += item.score;
        totalQuestionsAttemptedInHistory += item.questions.length;
      });

      const quizzesTaken = loadedHistory.length;
      const topics = Array.from(new Set(loadedHistory.map(item => item.documentName)));
      
      const overallAccuracy = totalQuestionsAttemptedInHistory > 0 ? Math.round((totalCorrectAnswers / totalQuestionsAttemptedInHistory) * 100) : 0;
      
      let sumOfQuizPercentages = 0;
      loadedHistory.forEach(item => {
        if (item.questions.length > 0) {
          sumOfQuizPercentages += (item.score / item.questions.length) * 100;
        }
      });
      const averageScore = quizzesTaken > 0 ? Math.round(sumOfQuizPercentages / quizzesTaken) : 0;

      setMetrics({
        overallAccuracy: overallAccuracy,
        quizzesTaken: quizzesTaken,
        topicsStudied: topics.slice(0, 5), 
        averageScore: averageScore,
      });
    }
    setIsLoading(false);
  }, []);

  const FeatureButton = ({ href, icon: Icon, title, description, className }: { href: string, icon: React.ElementType, title: string, description: string, className?: string }) => (
    <Button
      variant="outline"
      className={`h-auto p-6 flex flex-col items-start text-left space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300 border-border ${className || ''}`}
      asChild
    >
      <Link href={href}>
        <div className="flex items-center space-x-3 mb-2">
          <Icon className="w-10 h-10 text-primary" />
          <CardTitle className="text-xl font-headline">{title}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </Link>
    </Button>
  );

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 space-y-10">
        <Card className="shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20 border-4 border-background shadow-md">
                <AvatarImage src="https://placehold.co/150x150.png" alt="User Avatar" data-ai-hint="professional avatar" />
                <AvatarFallback><UserCircle className="w-10 h-10" /></AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl font-headline text-primary">Welcome Back, AI Learner!</CardTitle>
                <CardDescription className="text-lg text-muted-foreground">Ready to dive into your next learning adventure?</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <section>
          <h2 className="text-2xl font-semibold font-headline mb-6 text-center text-foreground/90">Start Your Learning Journey</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureButton
              href="/knowledge-base/new"
              icon={DatabaseZap}
              title="Build Knowledge Base"
              description="Upload content (PDF, text, image, audio) to create summaries and store them."
              className="bg-gradient-to-br from-green-500/5 via-transparent to-green-500/5 hover:from-green-500/10 hover:to-green-500/10"
            />
             <FeatureButton
              href="/quiz-session/new"
              icon={Brain}
              title="Upload & Quiz"
              description="Upload new content. It's added to KB & a quiz starts immediately."
              className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 hover:from-primary/10 hover:to-primary/10"
            />
             <FeatureButton
              href="/quiz-from-kb"
              icon={Edit3} 
              title="Quiz from Knowledge Base"
              description="Select from your knowledge base to start an interactive quiz."
              className="bg-gradient-to-br from-orange-500/5 via-transparent to-orange-500/5 hover:from-orange-500/10 hover:to-orange-500/10"
            />
            <FeatureButton
              href="/flashcards"
              icon={Layers}
              title="Flash Me (from KB)"
              description="Create or use flashcards from your knowledge base. (Coming Soon)"
              className="bg-gradient-to-br from-accent/5 via-transparent to-accent/5 hover:from-accent/10 hover:to-accent/10"
            />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold font-headline mb-6 text-center text-foreground/90">Performance Snapshot</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <Card key={i} className="h-36 animate-pulse bg-muted/50"></Card>)}
            </div>
          ) : metrics.quizzesTaken > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><PieChart className="mr-2 h-5 w-5 text-primary" /> Overall Accuracy</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-primary">{metrics.overallAccuracy}%</p></CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><CheckSquare className="mr-2 h-5 w-5 text-primary" /> Quizzes Taken</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-primary">{metrics.quizzesTaken}</p></CardContent>
              </Card>
               <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><Activity className="mr-2 h-5 w-5 text-primary" /> Avg. Quiz Score</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-primary">{metrics.averageScore}%</p></CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow col-span-1 md:col-span-2 lg:col-span-1">
                <CardHeader><CardTitle className="text-lg flex items-center"><BookCopy className="mr-2 h-5 w-5 text-primary" /> Recent Topics</CardTitle></CardHeader>
                <CardContent>
                  {metrics.topicsStudied.length > 0 ? (
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      {metrics.topicsStudied.map(topic => <li key={topic} className="truncate">{topic}</li>)}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">No topics studied yet.</p>}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="text-center py-10 shadow-md">
                <CardContent>
                    <TrendingUp className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-xl text-muted-foreground">No quiz history yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Complete a quiz session to see your stats!</p>
                </CardContent>
            </Card>
          )}
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold font-headline mb-6 text-center text-foreground/90">Learning Analytics (Coming Soon)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-md bg-muted/30">
              <CardHeader><CardTitle className="text-lg flex items-center"><Target className="mr-2 h-5 w-5 text-green-500" /> Strongest Topics</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">AI will analyze your performance to highlight your strengths here.</p></CardContent>
            </Card>
            <Card className="shadow-md bg-muted/30">
              <CardHeader><CardTitle className="text-lg flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-amber-500" /> Areas for Improvement</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">AI will identify topics or question types where you can focus your learning.</p></CardContent>
            </Card>
          </div>
        </section>
      </div>
    </ClientAuthGuard>
  );
}
