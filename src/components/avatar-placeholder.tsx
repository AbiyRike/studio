import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

interface AvatarPlaceholderProps {
  feedbackType?: 'neutral' | 'correct' | 'incorrect';
}

export function AvatarPlaceholder({ feedbackType = 'neutral' }: AvatarPlaceholderProps) {
  let avatarMessage = "I'm here to help you learn!";
  let borderColor = "border-primary";

  if (feedbackType === 'correct') {
    avatarMessage = "Great job! That's correct! 🎉";
    borderColor = "border-green-500";
  } else if (feedbackType === 'incorrect') {
    avatarMessage = "Not quite, but that's okay! Let's learn together. 😊";
    borderColor = "border-red-500";
  }

  return (
    <Card className={`w-full max-w-sm mx-auto shadow-lg border-2 ${borderColor} transition-all duration-300`}>
      <CardContent className="p-6 flex flex-col items-center space-y-4">
        <div className="rounded-full overflow-hidden border-4 border-background shadow-md">
          <Image
            src="https://placehold.co/200x200.png"
            alt="AI Tutor Avatar"
            width={150}
            height={150}
            className="object-cover"
            data-ai-hint="humanoid robot friendly"
          />
        </div>
        <p className="text-center text-foreground font-medium">{avatarMessage}</p>
      </CardContent>
    </Card>
  );
}
