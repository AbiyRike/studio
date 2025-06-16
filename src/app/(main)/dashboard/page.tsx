
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getLearningHistory, type HistoryItem } from '@/lib/session-store';
import { getKnowledgeBaseItems } from '@/lib/knowledge-base-store';
import { Brain, Layers, UserCircle, TrendingUp, BookCopy, Target, AlertTriangle, PieChart, CheckSquare, Activity, DatabaseZap, Edit3, GraduationCap, CheckCircle2, XCircle, HelpCircle, MessageCircleQuestion, Code2, BookOpenCheck, Briefcase, Video, FolderKanban, Home, Sparkles } from 'lucide-react';
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
}

export default function EnhancedDashboardPage() {
  const router = useRouter(); // Initialize router here
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

  const loadUserData = () => {
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
      const topicPerformance: { [key: string]: { totalScore: number; totalQuestions: number; quizCount: number } } = {};

      loadedHistory.forEach(item => {
        calculatedTotalCorrectAnswers += item.score;
        calculatedTotalQuestionsAttempted += item.questions.length;

        if (!topicPerformance[item.documentName]) {
          topicPerformance[item.documentName] = { totalScore: 0, totalQuestions: 0, quizCount: 0 };
        }
        topicPerformance[item.documentName].totalScore += item.score;
        topicPerformance[item.documentName].totalQuestions += item.questions.length;
        topicPerformance[item.documentName].quizCount += 1;
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

      const topicAverages = Object.entries(topicPerformance).map(([name, data]) => {
        const average = data.totalQuestions > 0 ? Math.round((data.totalScore / data.totalQuestions) * 100) : 0;
        return { name, average, quizCount: data.quizCount };
      });

      setStrongestTopics([...topicAverages].sort((a, b) => b.average - a.average || b.quizCount - a.quizCount).slice(0, 3));
      setWeakestTopics([...topicAverages].sort((a, b) => a.average - b.average || b.quizCount - a.quizCount).filter(t => t.quizCount > 0).slice(0, 3));
      
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    window.addEventListener('storage', loadUserData); 
    return () => {
      window.removeEventListener('storage', loadUserData);
    };
  }, []);


  const FeatureButton = ({ href, icon: Icon, title, description, className }: { href: string, icon: React.ElementType, title: string, description: string, className?: string }) => (
    <Button
      variant="outline"
      className={`h-auto p-6 flex flex-col items-start text-left space-y-2 shadow-lg hover:shadow-xl transition-shadow duration-300 border-border ${className || ''}`}
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
              icon={Video} 
              title="Interactive Video Tutor"
              description="Select from KB for a step-by-step AI video tutoring session with Study AI+."
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><PieChart className="mr-2 h-5 w-5 text-primary" /> Accuracy</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-primary">{metrics.overallAccuracy}%</p></CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><CheckSquare className="mr-2 h-5 w-5 text-primary" /> Quizzes</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-primary">{metrics.quizzesTaken}</p></CardContent>
              </Card>
               <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><Activity className="mr-2 h-5 w-5 text-primary" /> Avg. Score</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-primary">{metrics.averageScore}%</p></CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><BookCopy className="mr-2 h-5 w-5 text-primary" /> Topics</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-primary">{metrics.topicsStudiedCount}</p></CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><DatabaseZap className="mr-2 h-5 w-5 text-primary" /> KB Items</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-primary">{metrics.knowledgeBaseSize}</p></CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><CheckCircle2 className="mr-2 h-5 w-5 text-green-500" /> Correct</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-green-500">{metrics.totalCorrectAnswers}</p></CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><HelpCircle className="mr-2 h-5 w-5 text-blue-500" /> Attempted</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-blue-500">{metrics.totalQuestionsAttempted}</p></CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader><CardTitle className="text-lg flex items-center"><XCircle className="mr-2 h-5 w-5 text-red-500" /> Incorrect</CardTitle></CardHeader>
                <CardContent><p className="text-4xl font-bold text-red-500">{metrics.totalIncorrectAnswers}</p></CardContent>
              </Card>
            </div>
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
          <h2 className="text-2xl font-semibold font-headline mb-6 text-center text-foreground/90">Learning Analytics</h2>
           {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="h-48 animate-pulse bg-muted/50"></Card>
                 <Card className="h-48 animate-pulse bg-muted/50"></Card>
            </div>
           ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-md">
                <CardHeader><CardTitle className="text-lg flex items-center"><Target className="mr-2 h-5 w-5 text-green-500" /> Strongest Topics</CardTitle></CardHeader>
                <CardContent>
                    {strongestTopics.length > 0 ? (
                    <ul className="space-y-2">
                        {strongestTopics.map(topic => (
                        <li key={topic.name} className="text-sm p-2 border-b last:border-b-0">
                            <span className="font-medium">{topic.name}</span>
                            <span className="text-xs text-muted-foreground float-right pt-1">Avg: {topic.average}% ({topic.quizCount} {topic.quizCount === 1 ? "quiz" : "quizzes"})</span>
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
                        <li key={topic.name} className="text-sm p-2 border-b last:border-b-0">
                            <span className="font-medium">{topic.name}</span>
                             <span className="text-xs text-muted-foreground float-right pt-1">Avg: {topic.average}% ({topic.quizCount} {topic.quizCount === 1 ? "quiz" : "quizzes"})</span>
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

