
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

interface AvatarPlaceholderProps {
  feedbackType?: 'neutral' | 'correct' | 'incorrect'; // For quiz feedback
  message?: string; // For general messages during explanation
  subMessage?: string; // Optional sub-message
}

export function AvatarPlaceholder({ feedbackType = 'neutral', message, subMessage }: AvatarPlaceholderProps) {
  let avatarMessage = message || "I'm here to help you learn!";
  let borderColor = "border-primary";
  let avatarSubMessage = subMessage;

  if (!message) { // Only use feedbackType if no general message is provided
    if (feedbackType === 'correct') {
      avatarMessage = "Great job! That's correct! 🎉";
      borderColor = "border-green-500";
    } else if (feedbackType === 'incorrect') {
      avatarMessage = "Not quite, but that's okay! Let's learn together. 😊";
      borderColor = "border-red-500";
    }
  }


  return (
    <Card className={`w-full max-w-sm mx-auto shadow-lg border-2 ${borderColor} transition-all duration-300`}>
      <CardContent className="p-6 flex flex-col items-center space-y-3">
        <div className="rounded-full overflow-hidden border-4 border-background shadow-md">
          <Image
            src="data:image/png;base64,AI_TUTOR_AVATAR_DATA"
            alt="AI Tutor Avatar"
            width={150}
            height={150}
            className="object-cover"
            
          />
        </div>
        <p className="text-center text-foreground font-semibold text-lg">{avatarMessage}</p>
        {avatarSubMessage && <p className="text-center text-muted-foreground text-sm">{avatarSubMessage}</p>}
      </CardContent>
    </Card>
  );
}
