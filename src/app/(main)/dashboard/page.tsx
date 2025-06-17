"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getLearningHistory, type HistoryItem } from '@/lib/session-store';
import { getKnowledgeBaseItems } from '@/lib/knowledge-base-store';
import { Brain, Layers, UserCircle, TrendingUp, BookCopy, Target, AlertTriangle, PieChart, CheckSquare, Activity, DatabaseZap, Edit3, GraduationCap, CheckCircle2, XCircle, HelpCircle, MessageCircleQuestion, Code2, BookOpenCheck, Briefcase, Video, FolderKanban, Home, Sparkles, Library, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
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

  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Sparkles className="h-12 w-12 animate-pulse text-primary" />
      </div>
    );
  }
  return <>{children}</>;
};

interface Metrics {
  overallAccuracy: number;
  quizzesTaken: number;
  topicsStudiedCount: number;
  averageScore: number;
  knowledgeBaseSize: number;
  totalCorrectAnswers: number;
  totalQuestionsAttempted: number;
  totalIncorrectAnswers: number;
}

interface TopicAnalytics {
  name: string;
  average: number; 
  quizCount: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
}

export default function EnhancedDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("AI Learner");
  const [userProfilePic, setUserProfilePic] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({
    overallAccuracy: 0,
    quizzesTaken: 0,
    topicsStudiedCount: 0,
    averageScore: 0,
    knowledgeBaseSize: 0,
    totalCorrectAnswers: 0,
    totalQuestionsAttempted: 0,
    totalIncorrectAnswers: 0,
  });
  const [strongestTopics, setStrongestTopics] = useState<TopicAnalytics[]>([]);
  const [weakestTopics, setWeakestTopics] = useState<TopicAnalytics[]>([]);
  const [recentActivity, setRecentActivity] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem("userName");
      if (storedName) setUserName(storedName);
      const storedPic = localStorage.getItem("userProfilePic");
      setUserProfilePic(storedPic);

      const loadedHistory = getLearningHistory();
      const kbItems = getKnowledgeBaseItems();

      setRecentActivity(loadedHistory.slice(0, 3));

      let calculatedTotalCorrectAnswers = 0;
      let calculatedTotalQuestionsAttempted = 0;
      const topicPerformance: { [key: string]: { totalScore: number; totalQuestions: number; quizCount: number; correct: number; incorrect: number } } = {};

      loadedHistory.forEach(item => {
        calculatedTotalCorrectAnswers += item.score;
        calculatedTotalQuestionsAttempted += item.questions.length;

        if (!topicPerformance[item.documentName]) {
          topicPerformance[item.documentName] = { totalScore: 0, totalQuestions: 0, quizCount: 0, correct: 0, incorrect: 0 };
        }
        topicPerformance[item.documentName].totalScore += item.score;
        topicPerformance[item.documentName].totalQuestions += item.questions.length;
        topicPerformance[item.documentName].quizCount += 1;
        topicPerformance[item.documentName].correct += item.score;
        topicPerformance[item.documentName].incorrect += (item.questions.length - item.score);
      });

      const quizzesTaken = loadedHistory.length;
      const topicsStudied = Array.from(new Set(loadedHistory.map(item => item.documentName)));
      const overallAccuracy = calculatedTotalQuestionsAttempted > 0 ? Math.round((calculatedTotalCorrectAnswers / calculatedTotalQuestionsAttempted) * 100) : 0;

      let sumOfQuizPercentages = 0;
      loadedHistory.forEach(item => {
        if (item.questions.length > 0) {
          sumOfQuizPercentages += (item.score / item.questions.length) * 100;
        }
      });
      const averageScore = quizzesTaken > 0 ? Math.round(sumOfQuizPercentages / quizzesTaken) : 0;
      const totalIncorrectAnswers = calculatedTotalQuestionsAttempted - calculatedTotalCorrectAnswers;

      setMetrics({
        overallAccuracy: overallAccuracy,
        quizzesTaken: quizzesTaken,
        topicsStudiedCount: topicsStudied.length,
        averageScore: averageScore,
        knowledgeBaseSize: kbItems.length,
        totalCorrectAnswers: calculatedTotalCorrectAnswers,
        totalQuestionsAttempted: calculatedTotalQuestionsAttempted,
        totalIncorrectAnswers: totalIncorrectAnswers,
      });

      const topicAverages: TopicAnalytics[] = Object.entries(topicPerformance).map(([name, data]) => {
        const average = data.totalQuestions > 0 ? Math.round((data.totalScore / data.totalQuestions) * 100) : 0;
        return { name, average, quizCount: data.quizCount, correctAnswers: data.correct, incorrectAnswers: data.incorrect, totalQuestions: data.totalQuestions };
      });

      setStrongestTopics([...topicAverages].sort((a, b) => b.average - a.average || b.correctAnswers - a.correctAnswers).slice(0, 3));
      setWeakestTopics([...topicAverages].sort((a, b) => a.average - b.average || b.incorrectAnswers - a.incorrectAnswers).filter(t => t.totalQuestions > 0 && t.average < 100).slice(0, 3));

      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    loadUserData();
    window.addEventListener('storage', loadUserData);
    return () => {
      window.removeEventListener('storage', loadUserData);
    };
  }, [loadUserData]);


  const FeatureButton = ({ href, icon: Icon, title, description, className }: { href: string, icon: React.ElementType, title: string, description: string, className?: string }) => (
    <Button
      variant="outline"
      className={cn("h-auto p-6 flex flex-col items-start text-left space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300 border-border", className)}
      asChild
    >
      <Link href={href} className="flex flex-col w-full h-full">
        <div className="flex items-center space-x-3 mb-2">
          <Icon className="w-10 h-10 text-primary" />
          <CardTitle className="text-xl font-headline">{title}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground flex-grow">{description}</p>
      </Link>
    </Button>
  );
  
  const performanceChartData = [
    { name: 'Correct', value: metrics.totalCorrectAnswers, fill: 'hsl(var(--chart-2))' }, 
    { name: 'Incorrect', value: metrics.totalIncorrectAnswers, fill: 'hsl(var(--destructive))' }, 
  ];

  const chartConfig = {
    correct: { label: "Correct", color: "hsl(var(--chart-2))" },
    incorrect: { label: "Incorrect", color: "hsl(var(--destructive))" },
  } satisfies Parameters<typeof ChartContainer>[0]["config"];


  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8 space-y-10">
        <Card className="shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20 border-4 border-background shadow-md">
                <AvatarImage
                  src={userProfilePic || "https://placehold.co/100x100.png"}
                  alt={userName}
                  width={100} height={100}
                  data-ai-hint="profile avatar"
                  className="object-cover"
                />
                <AvatarFallback><UserCircle className="w-10 h-10" /></AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl font-headline text-primary">Welcome Back, {userName}!</CardTitle>
                <CardDescription className="text-lg text-muted-foreground">Ready to dive into your next learning adventure?</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <section>
          <h2 className="text-2xl font-semibold font-headline mb-6 text-center text-foreground/90">Start Your Learning Journey</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureButton
              href="/knowledge-base/manage"
              icon={FolderKanban}
              title="Knowledge Base"
              description="Manage, view, edit, or delete your uploaded content and summaries."
              className="bg-gradient-to-br from-green-500/5 via-transparent to-green-500/5 hover:from-green-500/10 hover:to-green-500/10"
            />
            <FeatureButton
              href="/contents"
              icon={Library}
              title="My Contents"
              description="Browse and access all items in your Knowledge Base."
              className="bg-gradient-to-br from-indigo-500/5 via-transparent to-indigo-500/5 hover:from-indigo-500/10 hover:to-indigo-500/10"
            />
             <FeatureButton
              href="/quiz-session/new"
              icon={Brain}
              title="New Quiz"
              description="Upload new content. It's added to KB & a quiz starts immediately."
              className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 hover:from-primary/10 hover:to-primary/10"
            />
             <FeatureButton
              href="/quiz-from-kb"
              icon={Edit3}
              title="Quiz from KB"
              description="Select from your knowledge base to start an interactive quiz."
              className="bg-gradient-to-br from-orange-500/5 via-transparent to-orange-500/5 hover:from-orange-500/10 hover:to-orange-500/10"
            />
            <FeatureButton
              href="/flashcards"
              icon={Layers}
              title="Flashcards"
              description="Create or use flashcards from your knowledge base for quick reviews."
              className="bg-gradient-to-br from-accent/5 via-transparent to-accent/5 hover:from-accent/10 hover:to-accent/10"
            />
            <FeatureButton
              href="/interactive-tutor/select"
              icon={Sparkles} /* Updated Icon for new tutor */
              title="Interactive Tutor"
              description="Engage with a dynamic, animated AI tutor on content from your knowledge base."
              className="bg-gradient-to-br from-purple-500/5 via-transparent to-purple-500/5 hover:from-purple-500/10 hover:to-purple-500/10"
            />
             <FeatureButton
              href="/ask-mr-know/select"
              icon={MessageCircleQuestion}
              title="Ask Mr. Know"
              description="Chat with Study AI+ about content selected from your knowledge base."
              className="bg-gradient-to-br from-sky-500/5 via-transparent to-sky-500/5 hover:from-sky-500/10 hover:to-sky-500/10"
            />
             <FeatureButton
              href="/code-with-me/select"
              icon={Code2}
              title="Code with Me"
              description="Learn programming languages interactively with Study AI+."
              className="bg-gradient-to-br from-rose-500/5 via-transparent to-rose-500/5 hover:from-rose-500/10 hover:to-rose-500/10"
            />
             <FeatureButton
              href="/code-wiz"
              icon={Wand2}
              title="Code Wiz"
              description="Analyze, explain, and optimize your code with AI assistance in real-time."
              className="bg-gradient-to-br from-yellow-500/5 via-transparent to-yellow-500/5 hover:from-yellow-500/10 hover:to-yellow-500/10"
            />
            <FeatureButton
              href="/mock-interview"
              icon={Briefcase}
              title="Mock Interview"
              description="Practice a case interview with AI interviewer Jane Smith."
              className="bg-gradient-to-br from-teal-500/5 via-transparent to-teal-500/5 hover:from-teal-500/10 hover:to-teal-500/10"
            />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold font-headline mb-6 text-center text-foreground/90">Performance Snapshot</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <Card key={i} className="h-36 animate-pulse bg-muted/50"></Card>)}
            </div>
          ) : metrics.quizzesTaken > 0 || metrics.knowledgeBaseSize > 0 ? (
            <>
              <Card className="shadow-lg mb-8">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center"><TrendingUp className="mr-2 h-6 w-6 text-primary"/> Quiz Performance Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Attempted</p>
                      <p className="text-3xl font-bold text-primary">{metrics.totalQuestionsAttempted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Correct</p>
                      <p className="text-3xl font-bold text-green-500">{metrics.totalCorrectAnswers}</p>
                    </div>
                    <div>
                      <p className="text-sm text-red-600">Incorrect</p>
                      <p className="text-3xl font-bold text-red-500">{metrics.totalIncorrectAnswers}</p>
                    </div>
                  </div>
                  {metrics.totalQuestionsAttempted > 0 && (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceChartData} layout="vertical" margin={{ right: 30, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" />
                          <Tooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent hideLabel />} />
                          <Legend verticalAlign="top" height={36} />
                          <Bar dataKey="value" radius={5}>
                            {performanceChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader><CardTitle className="text-lg flex items-center"><PieChart className="mr-2 h-5 w-5 text-primary" /> Accuracy</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold text-primary">{metrics.overallAccuracy}%</p></CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader><CardTitle className="text-lg flex items-center"><CheckSquare className="mr-2 h-5 w-5 text-primary" /> Quizzes</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold text-primary">{metrics.quizzesTaken}</p></CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader><CardTitle className="text-lg flex items-center"><BookCopy className="mr-2 h-5 w-5 text-primary" /> Topics</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold text-primary">{metrics.topicsStudiedCount}</p></CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader><CardTitle className="text-lg flex items-center"><DatabaseZap className="mr-2 h-5 w-5 text-primary" /> KB Items</CardTitle></CardHeader>
                    <CardContent><p className="text-4xl font-bold text-primary">{metrics.knowledgeBaseSize}</p></CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="text-center py-10 shadow-md col-span-1 md:col-span-2 lg:grid-cols-3 xl:col-span-4">
                <CardContent>
                    <TrendingUp className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-xl text-muted-foreground">No learning data yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Add to your knowledge base or complete a quiz to see your stats!</p>
                </CardContent>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold font-headline mb-6 text-center text-foreground/90">Recent Learning Activity</h2>
          {isLoading ? (
            <Card className="h-48 animate-pulse bg-muted/50"></Card>
          ) : recentActivity.length > 0 ? (
            <Card className="shadow-md">
              <CardContent className="p-4 space-y-3">
                <ul className="space-y-3">
                  {recentActivity.map((item) => (
                    <li key={item.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <BookOpenCheck className="h-6 w-6 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{item.documentName}</p>
                          <p className="text-xs text-muted-foreground">
                            Completed: {format(new Date(item.completedAt), "PP")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {item.score}/{item.questions.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ({item.questions.length > 0 ? Math.round((item.score / item.questions.length) * 100) : 0}%)
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {metrics.quizzesTaken > 3 && (
                   <div className="text-center mt-4">
                    <Button variant="link" asChild>
                        <Link href="/history">View All History</Link>
                    </Button>
                   </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-10 shadow-md">
              <CardContent>
                <Activity className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl text-muted-foreground">No recent activity found.</p>
                <p className="text-sm text-muted-foreground mt-1">Complete a quiz to see your recent activities here.</p>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold font-headline mb-6 text-center text-foreground/90">Learning Focus</h2>
           {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="h-48 animate-pulse bg-muted/50"></Card>
                 <Card className="h-48 animate-pulse bg-muted/50"></Card>
            </div>
           ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-md">
                <CardHeader><CardTitle className="text-lg flex items-center"><Target className="mr-2 h-5 w-5 text-green-500" /> Areas of Excellence</CardTitle></CardHeader>
                <CardContent>
                    {strongestTopics.length > 0 ? (
                    <ul className="space-y-2">
                        {strongestTopics.map(topic => (
                        <li key={topic.name} className="text-sm p-3 border rounded-md bg-green-50 dark:bg-green-900/20">
                            <div className="font-medium text-green-700 dark:text-green-300">{topic.name}</div>
                            <div className="text-xs text-green-600 dark:text-green-400">
                                Avg: {topic.average}% ({topic.correctAnswers}/{topic.totalQuestions} correct from {topic.quizCount} {topic.quizCount === 1 ? "quiz" : "quizzes"})
                            </div>
                        </li>
                        ))}
                    </ul>
                    ) : <p className="text-sm text-muted-foreground">Not enough quiz data to determine strongest topics. Keep learning!</p>}
                </CardContent>
                </Card>
                <Card className="shadow-md">
                <CardHeader><CardTitle className="text-lg flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-amber-500" /> Areas for Improvement</CardTitle></CardHeader>
                <CardContent>
                    {weakestTopics.length > 0 ? (
                    <ul className="space-y-2">
                        {weakestTopics.map(topic => (
                         <li key={topic.name} className="text-sm p-3 border rounded-md bg-amber-50 dark:bg-amber-900/20">
                            <div className="font-medium text-amber-700 dark:text-amber-300">{topic.name}</div>
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                                Avg: {topic.average}% ({topic.correctAnswers}/{topic.totalQuestions} correct from {topic.quizCount} {topic.quizCount === 1 ? "quiz" : "quizzes"})
                            </div>
                             <p className="text-xs text-muted-foreground mt-1">Focus here: {topic.incorrectAnswers} incorrect answers.</p>
                        </li>
                        ))}
                    </ul>
                    ) : <p className="text-sm text-muted-foreground">No specific areas for improvement identified yet. Great job, or more data needed!</p>}
                </CardContent>
                </Card>
            </div>
           )}
        </section>
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    </ClientAuthGuard>
  );
}