
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, History, LogOut, Brain, DatabaseZap, Edit3, Layers } from "lucide-react"; // Added Edit3, Layers
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge-base/new", label: "Build Knowledge Base", icon: DatabaseZap },
  { href: "/quiz-session/new", label: "Quiz Me (New Upload)", icon: Brain },
  { href: "/quiz-from-kb", label: "Tutor Me (KB Quiz)", icon: Edit3 },
  { href: "/history", label: "Learning History", icon: History },
  { href: "/flashcards", label: "Flash Me (Soon)", icon: Layers },
  // { href: "/live-tutor", label: "Live Tutor (Soon)", icon: GraduationCap }, // Example for future
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("isLoggedIn");
    }
    router.push("/login");
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
