
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Brain, DatabaseZap, Edit3, Layers, GraduationCap, MessageCircleQuestion, Code2, Sparkles } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => (
  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/80 backdrop-blur-sm">
    <CardHeader className="flex flex-row items-center gap-3 pb-3">
      <Icon className="w-8 h-8 text-primary" />
      <CardTitle className="text-xl font-headline">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background text-foreground">
      <nav className="py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 bg-background/70 backdrop-blur-md shadow-sm">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline text-primary">Study AI+</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">Login / Sign Up</Link>
        </Button>
      </nav>

      <main className="container mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <section className="text-center mb-20 md:mb-32">
          <div className="relative w-full max-w-3xl mx-auto mb-8 h-64 md:h-80 rounded-xl overflow-hidden shadow-2xl">
            <Image
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAJYCAYAAACadoJwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFiUAABYlAUlSJPAAAP+GSURBVHja7L0JmBzVdeD/z+t/7/uY7zfffPPNbrOZXI4kt8m15JJU9gPZtthS2JIY0h7DkIZHkEwQkIAEyT0n99zz7E7vnJ3Z3Tszu9/Z2bOzs1+T7HLLP9n2qVf/uLPD6e9E//mRz8A3bXW/H4yVp2p5/8q8p38u//d/lX/1H89/38z/49f/H//kX//z93/5l3/513/913/9l3/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/913/9P8p/L/5P8qfp/k/yr+n+V/0vyv5f8r+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5f8r+X/K/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lf6/Zf8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/7P8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lf6/Zf8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lf6/Zf8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X8v+V/L/lfy/5X+v2X/ACgZtY0PqYJq0K6lE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6hE+oRPqET6pAnH/Ap9f+50qP3PAAAAAElFTkSuQmCC"
              alt="Study AI+ landing page hero image"
              width={700}
              height={400}
              className="object-cover"
              priority
              data-ai-hint="student robot learning"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10"></div>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold font-headline mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Unlock Your Learning Potential with AI
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Study AI+ transforms your documents and ideas into interactive learning experiences. Summarize, quiz, chat, and code your way to mastery.
          </p>
          <Button asChild size="lg" className="text-lg py-7 px-10 shadow-lg hover:shadow-primary/30 transition-shadow">
            <Link href="/login">
              Start AI Engine <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </section>

        {/* Features Section */}
        <section>
          <h3 className="text-3xl md:text-4xl font-bold font-headline text-center mb-12 md:mb-16">
            Explore Our Powerful Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={DatabaseZap}
              title="Knowledge Base"
              description="Upload documents, images, or audio. AI summarizes and stores them for easy access and learning."
            />
            <FeatureCard
              icon={Edit3}
              title="AI-Powered Quizzes"
              description="Generate dynamic quizzes from your content or knowledge base to test your understanding."
            />
            <FeatureCard
              icon={GraduationCap}
              title="Interactive Tutor"
              description="Step-by-step AI tutoring on your selected content, with explanations and mini-quizzes."
            />
            <FeatureCard
              icon={Layers}
              title="Smart Flashcards"
              description="Create and study flashcards generated from your materials for effective memorization."
            />
            <FeatureCard
              icon={MessageCircleQuestion}
              title="Ask Mr. Know"
              description="Engage in contextual chat with an AI about any item in your knowledge base."
            />
            <FeatureCard
              icon={Code2}
              title="Code with Me"
              description="Learn programming languages interactively, from syntax basics to core concepts."
            />
          </div>
        </section>
      </main>

      <footer className="py-8 text-center border-t border-border/20 mt-20 md:mt-32">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Study AI+. All rights reserved.</p>
      </footer>
    </div>
  );
}
