
"use client";

import { useState, useEffect } from 'react';
import type { TutorSessionData } from '@/app/actions';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, Info, Sparkles } from 'lucide-react';
import { AvatarPlaceholder } from './avatar-placeholder';
import { addToLearningHistory, HistoryItem, setActiveTutorSession } from '@/lib/session-store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface InteractiveQuizProps {
  sessionData: TutorSessionData;
}

export function InteractiveQuiz({ sessionData }: InteractiveQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(Array(sessionData.questions.length).fill(null));
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<'neutral' | 'correct' | 'incorrect'>('neutral');

  const router = useRouter();
  const { toast } = useToast();

  const currentQuestion = sessionData.questions[currentQuestionIndex];
  const isCorrect = selectedAnswer === currentQuestion?.answer;

  const handleAnswerSubmit = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setUserAnswers(newAnswers);

    setShowFeedback(true);
    if (isCorrect) {
      setScore(score + 1);
      setAvatarFeedback('correct');
    } else {
      setAvatarFeedback('incorrect');
    }
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    setAvatarFeedback('neutral');
    if (currentQuestionIndex < sessionData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setQuizFinished(true);
      saveHistoryAndClearActiveSession();
    }
  };
  
  const saveHistoryAndClearActiveSession = () => {
    const historyItem: HistoryItem = {
      id: new Date().toISOString() + '_' + sessionData.documentName.replace(/\s/g, '_'), 
      documentName: sessionData.documentName,
      summary: sessionData.summary,
      questions: sessionData.questions,
      documentContent: sessionData.documentContent,
      mediaDataUri: sessionData.mediaDataUri,
      userAnswers,
      score,
      completedAt: new Date().toISOString(),
    };
    addToLearningHistory(historyItem);
    setActiveTutorSession(null); // Clear the active session from localStorage
    toast({
        title: "Session Complete!",
        description: "Your progress has been saved to Learning History.",
    });
  };

  if (quizFinished) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center text-primary">Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Sparkles className="mx-auto h-16 w-16 text-yellow-500" />
          <p className="text-xl">You scored {score} out of {sessionData.questions.length}.</p>
          <AvatarPlaceholder feedbackType={score > sessionData.questions.length / 2 ? 'correct' : 'neutral'} />
          <p className="text-muted-foreground">Great effort! You can review this session in your Learning History.</p>
        </CardContent>
        <CardFooter className="flex justify-around">
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            <Button variant="outline" onClick={() => router.push('/history')}>View History</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!currentQuestion) {
    // This case should ideally not be hit if sessionData is validated upstream
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader><CardTitle>Error</CardTitle></CardHeader>
            <CardContent><p>No questions available for this session. Please start a new session.</p></CardContent>
            <CardFooter><Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button></CardFooter>
        </Card>
    );
  }

  const progressValue = ((currentQuestionIndex + 1) / sessionData.questions.length) * 100;

  return (
    <div className="space-y-8">
      <AvatarPlaceholder feedbackType={avatarFeedback} />
      <Card className="w-full shadow-xl">
        <CardHeader>
          <Progress value={progressValue} className="w-full mb-4" />
          <CardTitle className="text-2xl font-headline">Question {currentQuestionIndex + 1} of {sessionData.questions.length}</CardTitle>
          <CardDescription className="text-lg pt-2">{currentQuestion.question}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedAnswer !== null ? selectedAnswer.toString() : undefined}
            onValueChange={(value) => setSelectedAnswer(parseInt(value))}
            disabled={showFeedback}
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
            <Button onClick={handleAnswerSubmit} disabled={selectedAnswer === null} className="w-full text-lg py-3">
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} className="w-full text-lg py-3">
              {currentQuestionIndex < sessionData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </Button>
          )}
        </CardFooter>
      </Card>

      {showFeedback && (
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
