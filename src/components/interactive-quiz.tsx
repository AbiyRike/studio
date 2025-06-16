
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TutorSessionData, Question } from '@/app/actions';
import { generateAdditionalQuestions } from '@/app/actions';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, Sparkles, Loader2, HelpCircle, ListChecks, Home, History } from 'lucide-react';
import { addToLearningHistory, HistoryItem, setActiveTutorSession } from '@/lib/session-store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";


interface InteractiveQuizProps {
  sessionData: TutorSessionData;
}

const MAX_QUESTIONS = 100;
const QUESTIONS_PER_BATCH = 5;

export function InteractiveQuiz({ sessionData }: InteractiveQuizProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [allQuestions, setAllQuestions] = useState<Question[]>(() => sessionData.questions || []);
  const [allUserAnswers, setAllUserAnswers] = useState<(number | null)[]>(() => Array(sessionData.questions?.length || 0).fill(null));
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  
  const [quizFinished, setQuizFinished] = useState(false);
  const [isFetchingNextBatch, setIsFetchingNextBatch] = useState(false);
  const [hasMoreQuestionsToFetch, setHasMoreQuestionsToFetch] = useState(true);
  
  const questionsDisplayedCount = allQuestions.length;
  const progressValue = questionsDisplayedCount > 0 ? ((currentQuestionIndex + 1) / Math.min(questionsDisplayedCount, MAX_QUESTIONS)) * 100 : 0;


  useEffect(() => {
    if (sessionData.questions.length === 0) {
        setHasMoreQuestionsToFetch(false);
        setQuizFinished(true);
        toast({
            title: "No Questions Available",
            description: "The AI could not generate questions for this content.",
            variant: "destructive",
        });
    } else if (sessionData.questions.length >= MAX_QUESTIONS) {
        setHasMoreQuestionsToFetch(false);
    }
  }, [sessionData.questions, toast]);


  const currentQuestion = allQuestions[currentQuestionIndex];
  const isCorrect = selectedAnswer === currentQuestion?.answer;

  const saveHistoryAndClearActiveSession = useCallback(() => {
    if (!quizFinished) return; 
    const historyItem: HistoryItem = {
      id: new Date().toISOString() + '_' + sessionData.documentName.replace(/\s/g, '_'), 
      documentName: sessionData.documentName,
      summary: sessionData.summary,
      questions: allQuestions,
      documentContent: sessionData.documentContent,
      mediaDataUri: sessionData.mediaDataUri,
      userAnswers: allUserAnswers,
      score,
      completedAt: new Date().toISOString(),
    };
    addToLearningHistory(historyItem);
    setActiveTutorSession(null); 
    toast({
        title: "Session Complete!",
        description: `Your progress for ${allQuestions.length} questions has been saved.`,
    });
  }, [quizFinished, sessionData, allQuestions, allUserAnswers, score, toast]);

  const fetchNextBatch = useCallback(async () => {
    if (isFetchingNextBatch || !hasMoreQuestionsToFetch || allQuestions.length >= MAX_QUESTIONS) {
      return;
    }

    setIsFetchingNextBatch(true);

    const previousQuestionTexts = allQuestions.map(q => q.question);
    const result = await generateAdditionalQuestions({
      documentContent: sessionData.documentContent || "",
      mediaDataUri: sessionData.mediaDataUri,
      previousQuestionTexts: previousQuestionTexts,
    });

    setIsFetchingNextBatch(false);

    if ('error' in result) {
      toast({
        title: "Error Fetching Questions",
        description: result.error,
        variant: "destructive",
      });
      setHasMoreQuestionsToFetch(false); 
      if (currentQuestionIndex >= allQuestions.length -1) { 
        setQuizFinished(true);
        saveHistoryAndClearActiveSession();
      }
    } else if (result.questions && result.questions.length > 0) {
      setAllQuestions(prev => [...prev, ...result.questions]);
      setAllUserAnswers(prev => [...prev, ...Array(result.questions.length).fill(null)]);
      
      const newTotalQuestions = allQuestions.length + result.questions.length;
      if (result.questions.length < QUESTIONS_PER_BATCH || newTotalQuestions >= MAX_QUESTIONS) {
        setHasMoreQuestionsToFetch(false);
      }
    } else {
      if (!('error' in result)) {
         toast({
            title: "No More Unique Questions",
            description: "The AI couldn't generate more unique questions for this content.",
         });
      }
      setHasMoreQuestionsToFetch(false);
      if (currentQuestionIndex >= allQuestions.length -1) { 
        setQuizFinished(true);
        saveHistoryAndClearActiveSession();
      }
    }
  }, [isFetchingNextBatch, hasMoreQuestionsToFetch, allQuestions, sessionData, toast, currentQuestionIndex, saveHistoryAndClearActiveSession]);

  const handleAnswerSubmit = () => {
    if (selectedAnswer === null || !currentQuestion) return;

    const newAnswers = [...allUserAnswers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAllUserAnswers(newAnswers);

    setShowFeedback(true);
    if (selectedAnswer === currentQuestion.answer) {
      setScore(s => s + 1);
    } 
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);

    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else { 
      if (hasMoreQuestionsToFetch && allQuestions.length < MAX_QUESTIONS) {
        fetchNextBatch(); 
      } else {
        setQuizFinished(true);
        saveHistoryAndClearActiveSession();
      }
    }
  };
  
  if (quizFinished && !isFetchingNextBatch) {
    const incorrectAnswers = allQuestions.map((q, index) => ({
        ...q,
        userAnswer: allUserAnswers[index],
        originalIndex: index,
    })).filter(q => q.userAnswer !== null && q.userAnswer !== q.answer);

    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Sparkles className="mx-auto h-16 w-16 text-yellow-500 mb-3" />
          <CardTitle className="text-3xl font-headline text-primary">Quiz Complete!</CardTitle>
          <CardDescription className="text-lg">
            You scored {score} out of {allQuestions.length} questions.
            ({allQuestions.length > 0 ? ((score / allQuestions.length) * 100).toFixed(0) : 0}%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {incorrectAnswers.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3 text-center flex items-center justify-center">
                <ListChecks className="mr-2 h-6 w-6 text-primary" /> Review Your Answers
              </h3>
              <ScrollArea className="h-[300px] rounded-md border p-4 bg-muted/50">
                <div className="space-y-4">
                {incorrectAnswers.map((item, idx) => (
                  <Card key={idx} className="p-4 bg-background shadow-sm">
                    <p className="font-semibold text-base mb-1">
                      Q{item.originalIndex + 1}: {item.question}
                    </p>
                    <p className="text-sm text-red-600">
                      Your answer: {item.options[item.userAnswer!]} <XCircle className="inline h-4 w-4 ml-1" />
                    </p>
                    <p className="text-sm text-green-600">
                      Correct answer: {item.options[item.answer]} <CheckCircle className="inline h-4 w-4 ml-1" />
                    </p>
                    {item.explanation && (
                      <p className="mt-2 text-xs text-blue-700 bg-blue-100 p-2 rounded-md dark:bg-blue-900/30 dark:text-blue-300">
                        <HelpCircle className="inline mr-1 h-3 w-3" />
                        Explanation: {item.explanation}
                      </p>
                    )}
                  </Card>
                ))}
                </div>
              </ScrollArea>
            </div>
          )}
           {incorrectAnswers.length === 0 && allQuestions.length > 0 && (
             <p className="text-center text-green-600 font-medium text-lg">Amazing! You got all questions correct!</p>
           )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-around gap-3 p-6">
            <Button onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/history')} className="w-full sm:w-auto">
                <History className="mr-2 h-4 w-4" /> View History
            </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!currentQuestion && !isFetchingNextBatch && allQuestions.length === 0) {
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader><CardTitle>Loading Questions...</CardTitle></CardHeader>
            <CardContent className="text-center py-10">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <p>Please wait while we prepare your quiz.</p>
                 <p className="text-sm text-muted-foreground mt-2">If this takes too long, the AI might be having trouble generating questions for the provided content.</p>
            </CardContent>
            <CardFooter><Button onClick={() => router.push('/dashboard')}><Home className="mr-2 h-4 w-4" /> Back to Dashboard</Button></CardFooter>
        </Card>
    );
  }
  

  return (
    <div className="space-y-8">
      <Card className="w-full shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs font-medium text-muted-foreground">Question {currentQuestionIndex + 1}</span>
            <Progress value={progressValue} className="flex-1" aria-label={`Quiz progress ${progressValue.toFixed(0)}%`} />
            <span className="text-xs font-medium text-muted-foreground">Max {Math.min(questionsDisplayedCount, MAX_QUESTIONS)}</span>
          </div>
          <CardTitle className="text-2xl font-headline">
            {currentQuestion?.question || (isFetchingNextBatch ? "Loading next question..." : "Preparing question...")}
          </CardTitle>
          {!currentQuestion && isFetchingNextBatch && <CardDescription className="text-muted-foreground pt-2">Fetching more questions for you...</CardDescription>}
        </CardHeader>
        {currentQuestion && (
          <>
            <CardContent>
              <RadioGroup
                value={selectedAnswer !== null ? selectedAnswer.toString() : undefined}
                onValueChange={(value) => setSelectedAnswer(parseInt(value))}
                disabled={showFeedback || isFetchingNextBatch}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <Label
                    key={index}
                    htmlFor={`option-${index}-${currentQuestionIndex}`} // Ensure unique ID per question render
                    className={cn(
                      "flex items-center p-4 border rounded-lg cursor-pointer transition-all",
                      "hover:border-primary",
                      selectedAnswer === index && "border-primary ring-2 ring-primary",
                      showFeedback && index === currentQuestion.answer && "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
                      showFeedback && index !== currentQuestion.answer && selectedAnswer === index && "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                    )}
                  >
                    <RadioGroupItem value={index.toString()} id={`option-${index}-${currentQuestionIndex}`} className="mr-3" />
                    <span className="text-base">{option}</span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-4">
              {!showFeedback ? (
                <Button 
                  onClick={handleAnswerSubmit} 
                  disabled={selectedAnswer === null || isFetchingNextBatch} 
                  className="w-full text-lg py-3"
                >
                  {isFetchingNextBatch && currentQuestionIndex >= allQuestions.length -1 ? 
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...</> : 
                    "Submit Answer"
                  }
                </Button>
              ) : (
                <Button 
                    onClick={handleNextQuestion} 
                    className="w-full text-lg py-3"
                    disabled={isFetchingNextBatch && currentQuestionIndex >= allQuestions.length -1 && hasMoreQuestionsToFetch} 
                >
                  {isFetchingNextBatch && currentQuestionIndex >= allQuestions.length -1 && hasMoreQuestionsToFetch ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Next...</>
                  ) : (currentQuestionIndex < allQuestions.length - 1 || (hasMoreQuestionsToFetch && allQuestions.length < MAX_QUESTIONS)) ? 
                    'Next Question' : 
                    'Finish Quiz'
                  }
                </Button>
              )}
            </CardFooter>
          </>
        )}
        {!currentQuestion && !isFetchingNextBatch && !quizFinished && allQuestions.length > 0 && (
             <CardContent className="text-center py-10">
                <p className="text-muted-foreground">Preparing question...</p>
            </CardContent>
        )}
      </Card>

      {showFeedback && currentQuestion && (
        <Alert variant={isCorrect ? "default" : "destructive"} className={cn("transition-opacity duration-300", isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-red-500 bg-red-50 dark:bg-red-900/30")}>
          {isCorrect ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
          <AlertTitle className={cn("font-semibold", isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
            {isCorrect ? "Correct!" : "Not Quite!"}
          </AlertTitle>
          <AlertDescription className={cn(isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
            {currentQuestion.explanation || (isCorrect
              ? "Excellent work!"
              : `The correct answer was: ${currentQuestion.options[currentQuestion.answer]}`)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

