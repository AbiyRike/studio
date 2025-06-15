
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, History, LogOut, Brain, DatabaseZap, Edit3, Layers, GraduationCap, MessageCircleQuestion, Code2, User, Briefcase, Video } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/knowledge-base/new", label: "Add to Knowledge", icon: DatabaseZap },
  { href: "/quiz-session/new", label: "New Quiz", icon: Brain },
  { href: "/quiz-from-kb", label: "Quiz from KB", icon: Edit3 },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/interactive-tutor/select", label: "Interactive Tutor", icon: Video }, // Icon changed to Video for Tavus tutor
  { href: "/ask-mr-know/select", label: "Ask Mr. Know", icon: MessageCircleQuestion },
  { href: "/code-with-me/select", label: "Code with Me", icon: Code2 },
  { href: "/mock-interview", label: "Mock Interview", icon: Briefcase },
  { href: "/history", label: "Learning History", icon: History },
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userDepartment");
      localStorage.removeItem("userInstitution");
      localStorage.removeItem("userBirthday");
      localStorage.removeItem("userProfilePic");
      // Clear other session-specific data
      localStorage.removeItem('activeTutorSession');
      localStorage.removeItem('activeFlashcardSession');
      // localStorage.removeItem('activeInteractiveTutorSession'); // Old key, replaced by Tavus
      localStorage.removeItem('activeInteractiveTavusTutorSession'); // New key for video tutor
      localStorage.removeItem('activeAskMrKnowSession');
      localStorage.removeItem('activeCodeTeachingSession');
    }
    router.push("/"); // Redirect to homepage after logout
  };

  return (
    <nav className="flex flex-col gap-2 h-full">
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard") ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start",
            pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
          asChild
        >
          <Link href={item.href}>
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </Link>
        </Button>
      ))}
      <Button
        variant="ghost"
        className="w-full justify-start mt-auto hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5 mr-3" />
        Logout
      </Button>
    </nav>
  );
}

    