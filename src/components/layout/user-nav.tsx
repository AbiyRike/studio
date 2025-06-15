
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
import { LogOut, UserCircle, Settings } from "lucide-react"; // Added Settings
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export function UserNav() {
  const router = useRouter();
  const [userName, setUserName] = useState("AI Learner");
  const [userEmail, setUserEmail] = useState("learner@example.com");
  const [userProfilePic, setUserProfilePic] = useState<string | null>(null);

  const updateUserData = () => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem("userName");
      if (storedName) setUserName(storedName);
      const storedEmail = localStorage.getItem("userEmail");
      if (storedEmail) setUserEmail(storedEmail);
      const storedPic = localStorage.getItem("userProfilePic");
      setUserProfilePic(storedPic);
    }
  };

  useEffect(() => {
    updateUserData();
    // Listen for storage changes to update avatar if changed on profile page
    window.addEventListener('storage', updateUserData);
    return () => {
      window.removeEventListener('storage', updateUserData);
    };
  }, []);

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
      localStorage.removeItem('activeInteractiveTutorSession');
      localStorage.removeItem('activeAskMrKnowSession');
      localStorage.removeItem('activeCodeTeachingSession');
    }
    router.push("/"); // Redirect to homepage after logout
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
          {/* Placeholder for future settings page
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          */}
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
