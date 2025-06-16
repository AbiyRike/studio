
"use client";

import { useEffect, useState, useRef, type ChangeEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Save, Camera, Lock, CalendarIcon as CalendarIconLucide, Loader2, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription as UiAlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";


const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('isLoggedIn')) {
        router.push('/login');
      } else {
        setIsVerified(true);
      }
    }
  }, [router]);

  if (!isVerified) return null;
  return <>{children}</>;
};

interface UserProfileData {
  name: string;
  email: string;
  department: string;
  institution: string;
  birthday: Date | null;
  profilePic: string | null;
}

const MAX_PROFILE_PIC_SIZE_BYTES = 1 * 1024 * 1024; // 1MB limit for base64 string

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<UserProfileData>({
    name: '',
    email: '',
    department: '',
    institution: '',
    birthday: null,
    profilePic: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('userName') || '';
      const email = localStorage.getItem('userEmail') || '';
      const department = localStorage.getItem('userDepartment') || '';
      const institution = localStorage.getItem('userInstitution') || '';
      const birthdayString = localStorage.getItem('userBirthday');
      const birthday = birthdayString ? parseISO(birthdayString) : null;
      const profilePic = localStorage.getItem('userProfilePic') || null;
      setProfileData({ name, email, department, institution, birthday, profilePic });
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  }, [setProfileData]);

  const handleDateChange = useCallback((date: Date | undefined) => {
    setProfileData(prev => ({ ...prev, birthday: date || null }));
  }, [setProfileData]);

  const handleProfilePicChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_PROFILE_PIC_SIZE_BYTES * 0.75) { // Estimate original file size limit (base64 is ~33% larger)
          toast({
            title: "Image Too Large",
            description: `Please select an image smaller than ~${(MAX_PROFILE_PIC_SIZE_BYTES * 0.75 / (1024*1024)).toFixed(1)}MB.`,
            variant: "destructive",
          });
          if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (base64String.length > MAX_PROFILE_PIC_SIZE_BYTES) {
            toast({
                title: "Profile Image Too Large",
                description: "The selected image is too large after encoding. Please choose a smaller image.",
                variant: "destructive",
            });
            if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        } else {
            setProfileData(prev => ({ ...prev, profilePic: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  }, [toast, setProfileData]);

  const handleSaveChanges = () => {
    setIsSaving(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userName', profileData.name || '');
      localStorage.setItem('userEmail', profileData.email || '');
      localStorage.setItem('userDepartment', profileData.department || '');
      localStorage.setItem('userInstitution', profileData.institution || '');
      if (profileData.birthday) {
        localStorage.setItem('userBirthday', profileData.birthday.toISOString());
      } else {
        localStorage.removeItem('userBirthday');
      }

      if (profileData.profilePic) {
        if (profileData.profilePic.length > MAX_PROFILE_PIC_SIZE_BYTES) {
          toast({
            title: "Profile Image Not Saved",
            description: "The profile image is too large. Please choose a smaller one. Other changes were saved.",
            variant: "destructive",
          });
          // Don't save the large image, but other data is saved above
        } else {
          localStorage.setItem('userProfilePic', profileData.profilePic);
        }
      } else {
        localStorage.removeItem('userProfilePic');
      }

      toast({ title: "Profile Updated", description: "Your changes have been saved (or attempted)." });
      window.dispatchEvent(new Event('storage')); 
    }
    setIsSaving(false);
  };

  const handlePasswordVerification = () => {
    if (!currentPasswordInput.trim()) {
      toast({
        title: "Verification Failed",
        description: "Current password cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    // Simulate password check
    toast({
      title: "Password Verified",
      description: "Proceed to change password (Actual change UI not implemented).",
    });
    setIsPasswordDialogOpen(false);
    setCurrentPasswordInput(""); 
    // router.push('/profile/change-password'); 
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userDepartment');
      localStorage.removeItem('userInstitution');
      localStorage.removeItem('userBirthday');
      localStorage.removeItem('userProfilePic');
      localStorage.removeItem('activeTutorSession');
      localStorage.removeItem('activeFlashcardSession');
      localStorage.removeItem('activeInteractiveTavusTutorSession');
      localStorage.removeItem('activeAskMrKnowSession');
      localStorage.removeItem('activeCodeTeachingSession');
      window.dispatchEvent(new Event('storage')); 
    }
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push("/"); 
  };

  if (isLoading) {
    return (
      <ClientAuthGuard>
        <div className="container mx-auto py-8 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </ClientAuthGuard>
    );
  }

  return (
    <ClientAuthGuard>
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
          <CardHeader className="text-center">
            <User className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-headline">Your Profile</CardTitle>
            <CardDescription>Manage your account information and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-primary shadow-md">
                  <AvatarImage 
                    src={profileData.profilePic || "https://placehold.co/128x128.png"} 
                    alt={profileData.name || "User"}
                    width={128}
                    height={128}
                    data-ai-hint="profile avatar"
                    className="object-cover" 
                  />
                  <AvatarFallback className="text-4xl">
                    {profileData.name ? profileData.name.charAt(0).toUpperCase() : <User size={48} />}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full bg-background hover:bg-muted p-1 shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                  title="Change profile picture"
                >
                  <Camera className="h-5 w-5" />
                  <span className="sr-only">Change profile picture</span>
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePicChange}
                  disabled={isSaving}
                />
              </div>
              <p className="text-xs text-muted-foreground">Max image size: ~750KB. Larger images may not save.</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={profileData.name || ''} onChange={handleInputChange} className="mt-1" disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={profileData.email || ''} onChange={handleInputChange} className="mt-1" disabled={isSaving}/>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" value={profileData.department || ''} onChange={handleInputChange} placeholder="e.g., Computer Science" className="mt-1" disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" name="institution" value={profileData.institution || ''} onChange={handleInputChange} placeholder="e.g., University of Example" className="mt-1" disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="birthday">Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !profileData.birthday && "text-muted-foreground"
                      )}
                      disabled={isSaving}
                    >
                      <CalendarIconLucide className="mr-2 h-4 w-4" />
                      {profileData.birthday ? format(profileData.birthday, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={profileData.birthday || undefined}
                      onSelect={handleDateChange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <Button onClick={handleSaveChanges} className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>

            <AlertDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={isSaving}>
                  <Lock className="mr-2 h-4 w-4" /> Change Password
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Verify Current Password</AlertDialogTitle>
                  <AlertDialogDescription>
                    Please enter your current password to proceed. (This is a simulation)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setCurrentPasswordInput("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePasswordVerification}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
          </CardContent>
          <CardFooter>
             <Button variant="destructive" onClick={handleLogout} className="w-full" disabled={isSaving}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientAuthGuard>
  );
}

