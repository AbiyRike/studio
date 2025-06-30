"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, UserCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function UserNav() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [userName, setUserName] = useState("AI Learner");
  const [userEmail, setUserEmail] = useState("learner@example.com");
  const [userProfilePic, setUserProfilePic] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // If user is authenticated with Supabase, use their profile data
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || "AI Learner");
      setUserEmail(user.email || "learner@example.com");
      setUserProfilePic(user.user_metadata?.avatar_url || null);
    } else if (typeof window !== 'undefined') {
      // Fallback to localStorage for backward compatibility
      const storedName = localStorage.getItem("userName") || "AI Learner";
      setUserName(storedName);
      const storedEmail = localStorage.getItem("userEmail") || "learner@example.com";
      setUserEmail(storedEmail);
      const storedPic = localStorage.getItem("userProfilePic");
      setUserProfilePic(storedPic);
    }
  }, [user]);

  const handleLogout = async () => {
    // Clear all session data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeTutorSession');
      localStorage.removeItem('activeFlashcardSession');
      localStorage.removeItem('activeDynamicTutorSession');
      localStorage.removeItem('activeAskMrKnowSession');
      localStorage.removeItem('activeCodeTeachingSession');
      localStorage.removeItem('activeCodeWizSession');
    }
    
    // Sign out from Supabase
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative w-10 h-10 rounded-full">
          <Avatar className="w-9 h-9">
            <AvatarImage 
              src={userProfilePic || "https://placehold.co/40x40.png"} 
              alt={userName || "User"}
              width={40} 
              height={40}
              data-ai-hint="profile avatar"
              className="object-cover" 
            />
            <AvatarFallback>
              {userName ? userName.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/profile">
              <UserCircle className="w-4 h-4 mr-2" />
              Profile
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}