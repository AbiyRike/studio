
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
import { CheckCircle, XCircle, Sparkles, Loader2, HelpCircle, ListChecks } from 'lucide-react';
import { AvatarPlaceholder } from './avatar-placeholder';
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
  const [hasMoreQuestionsToFetch, setHasMoreQuestionsToFetch] = useState(true); // Initialize to true
  
  const [avatarFeedback, setAvatarFeedback] = useState<'neutral' | 'correct' | 'incorrect'>('neutral');
  const [avatarMessage, setAvatarMessage] = useState<string | undefined>(undefined);


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
        // If initial batch itself meets or exceeds max questions
        setHasMoreQuestionsToFetch(false);
    }
    // We no longer set hasMoreQuestionsToFetch to false if the initial batch is small.
    // Let the first call to fetchNextBatch or subsequent calls determine this.
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
    setAvatarMessage("Generating more questions for you...");

    const previousQuestionTexts = allQuestions.map(q => q.question);
    const result = await generateAdditionalQuestions({
      documentContent: sessionData.documentContent || "",
      mediaDataUri: sessionData.mediaDataUri,
      previousQuestionTexts: previousQuestionTexts,
    });

    setIsFetchingNextBatch(false);
    setAvatarMessage(undefined);

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
      
      // This auto-advance logic is tricky; for now, user clicks "Next" after loading.
      // if (showFeedback && currentQuestionIndex === allQuestions.length - 1 - result.questions.length) { 
      //    setCurrentQuestionIndex(prev => prev + 1); 
      //    setShowFeedback(false);
      //    setSelectedAnswer(null);
      //    setAvatarFeedback('neutral');
      // }

    } else {
      // No more questions returned by AI (empty array)
      if (!('error' in result)) { // Check if it wasn't already an error toast
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
      setAvatarFeedback('correct');
    } else {
      setAvatarFeedback('incorrect');
    }
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    setAvatarFeedback('neutral');

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
          <AvatarPlaceholder feedbackType={allQuestions.length > 0 && score > allQuestions.length / 2 ? 'correct' : 'neutral'} message="Great effort!" />
          
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
                      <p className="mt-2 text-xs text-blue-700 bg-blue-100 p-2 rounded-md">
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
            <Button onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">Back to Dashboard</Button>
            <Button variant="outline" onClick={() => router.push('/history')} className="w-full sm:w-auto">View History</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!currentQuestion && !isFetchingNextBatch && allQuestions.length === 0) {
    // This handles the case where initial questions were empty and quiz hasn't formally finished.
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader><CardTitle>Loading Questions...</CardTitle></CardHeader>
            <CardContent className="text-center py-10">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <p>Please wait while we prepare your quiz.</p>
                 <p className="text-sm text-muted-foreground mt-2">If this takes too long, the AI might be having trouble generating questions for the provided content.</p>
            </CardContent>
            <CardFooter><Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button></CardFooter>
        </Card>
    );
  }
  
  const progressValue = allQuestions.length > 0 ? ((currentQuestionIndex + 1) / Math.min(allQuestions.length, MAX_QUESTIONS)) * 100 : 0;
  const questionsDisplayedCount = allQuestions.length;


  return (
    <div className="space-y-8">
      <AvatarPlaceholder feedbackType={avatarFeedback} message={avatarMessage} />
      <Card className="w-full shadow-xl">
        <CardHeader>
          <Progress value={progressValue} className="w-full mb-4" />
          <CardTitle className="text-2xl font-headline">Question {currentQuestionIndex + 1} of {Math.min(questionsDisplayedCount, MAX_QUESTIONS)}{hasMoreQuestionsToFetch && questionsDisplayedCount < MAX_QUESTIONS && !isFetchingNextBatch ? ` (aiming for up to ${MAX_QUESTIONS})` : ""}</CardTitle>
          {currentQuestion && <CardDescription className="text-lg pt-2">{currentQuestion.question}</CardDescription>}
          {!currentQuestion && isFetchingNextBatch && <p className="text-muted-foreground pt-2">Loading next question...</p>}
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
                    htmlFor={`option-${index}`}
                    className={cn(
                      "flex items-center p-4 border rounded-lg cursor-pointer transition-all",
                      "hover:border-primary",
                      selectedAnswer === index && "border-primary ring-2 ring-primary",
                      showFeedback && index === currentQuestion.answer && "bg-green-100 border-green-500 text-green-700",
                      showFeedback && index !== currentQuestion.answer && selectedAnswer === index && "bg-red-100 border-red-500 text-red-700"
                    )}
                  >
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} className="mr-3" />
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
                    // Disable if fetching AND we are effectively waiting for that fetch to show the next question.
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
         {/* Fallback for when currentQuestion is null but quiz is not finished (e.g. initial load error not caught by quizFinished) */}
        {!currentQuestion && !isFetchingNextBatch && !quizFinished && allQuestions.length > 0 && (
             <CardContent className="text-center py-10">
                <p className="text-muted-foreground">Preparing question...</p>
            </CardContent>
        )}
      </Card>

      {showFeedback && currentQuestion && (
        <Alert variant={isCorrect ? "default" : "destructive"} className={isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          {isCorrect ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
          <AlertTitle className={isCorrect ? "text-green-700" : "text-red-700"}>
            {isCorrect ? "Correct!" : "Not Quite!"}
          </AlertTitle>
          <AlertDescription className={isCorrect ? "text-green-600" : "text-red-600"}>
            {currentQuestion.explanation || (isCorrect
              ? "Excellent work!"
              : `The correct answer was: ${currentQuestion.options[currentQuestion.answer]}`)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

