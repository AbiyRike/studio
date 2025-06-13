import type { HistoryItem } from '@/lib/session-store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { format } from 'date-fns';

interface DocumentHistoryCardProps {
  item: HistoryItem;
}

export function DocumentHistoryCard({ item }: DocumentHistoryCardProps) {
  const completionDate = format(new Date(item.completedAt), "MMMM d, yyyy 'at' h:mm a");
  const accuracy = item.questions.length > 0 ? (item.score / item.questions.length) * 100 : 0;

  return (
    <Card className="w-full shadow-lg overflow-hidden">
      <CardHeader className="bg-card-foreground/5 p-4">
        <CardTitle className="text-xl font-headline">{item.documentName}</CardTitle>
        <CardDescription>Completed on: {completionDate}</CardDescription>
        <div className="flex items-center gap-2 pt-2">
          <Badge variant={accuracy >= 70 ? "default" : "destructive"} className="bg-primary text-primary-foreground">
            Score: {item.score}/{item.questions.length} ({accuracy.toFixed(0)}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="summary">
            <AccordionTrigger className="text-lg hover:no-underline">Summary</AccordionTrigger>
            <AccordionContent className="pt-2 text-sm text-foreground/80">
              {item.summary}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="questions">
            <AccordionTrigger className="text-lg hover:no-underline">Questions & Answers</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-4">
              {item.questions.map((q, index) => {
                const userAnswer = item.userAnswers[index];
                const isCorrect = userAnswer === q.answer;
                return (
                  <div key={index} className="p-3 border rounded-md bg-background">
                    <p className="font-semibold text-base">{index + 1}. {q.question}</p>
                    <ul className="list-disc list-inside pl-4 mt-1 text-sm space-y-1">
                      {q.options.map((opt, optIndex) => (
                        <li key={optIndex} className={cn(
                          optIndex === q.answer && "text-green-600 font-medium",
                          optIndex === userAnswer && userAnswer !== q.answer && "text-red-600 line-through"
                        )}>
                          {opt}
                          {optIndex === q.answer && <CheckCircle className="inline ml-2 h-4 w-4 text-green-600" />}
                          {optIndex === userAnswer && userAnswer !== q.answer && <XCircle className="inline ml-2 h-4 w-4 text-red-600" />}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Your answer: {userAnswer !== null && userAnswer !== undefined ? q.options[userAnswer] : "Not answered"}
                    </p>
                    {!isCorrect && userAnswer !== null && (
                      <p className="mt-1 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        <HelpCircle className="inline mr-1 h-3 w-3" />
                        Explanation: {q.explanation || `Correct answer was ${q.options[q.answer]}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
