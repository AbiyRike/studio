
"use client";

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Edit, Save, Camera, Lock, CalendarIcon as CalendarIconLucide } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setProfileData(prev => ({ ...prev, birthday: date || null }));
  };

  const handleProfilePicChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, profilePic: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userName', profileData.name);
      localStorage.setItem('userEmail', profileData.email); // Assuming email can be changed, though typically it's fixed
      localStorage.setItem('userDepartment', profileData.department);
      localStorage.setItem('userInstitution', profileData.institution);
      if (profileData.birthday) {
        localStorage.setItem('userBirthday', profileData.birthday.toISOString());
      } else {
        localStorage.removeItem('userBirthday');
      }
      if (profileData.profilePic) {
        localStorage.setItem('userProfilePic', profileData.profilePic);
      } else {
        localStorage.removeItem('userProfilePic');
      }
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      // Force re-render of user-nav if it's not updating automatically
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleChangePassword = () => {
    toast({ title: "Feature Not Implemented", description: "Password change functionality is not yet available." });
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
      // Clear other session-specific data if any
      localStorage.removeItem('activeTutorSession');
      localStorage.removeItem('activeFlashcardSession');
      localStorage.removeItem('activeInteractiveTutorSession');
      localStorage.removeItem('activeAskMrKnowSession');
      localStorage.removeItem('activeCodeTeachingSession');

    }
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push("/"); // Redirect to homepage
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
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-primary shadow-md">
                  <AvatarImage 
                    src={profileData.profilePic || "https://placehold.co/128x128.png"} 
                    alt={profileData.name || "User"}
                    width={128}
                    height={128}
                    data-ai-hint="profile photo"
                    className="object-cover" 
                  />
                  <AvatarFallback className="text-4xl">
                    {profileData.name ? profileData.name.charAt(0).toUpperCase() : <User size={48} />}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full bg-background hover:bg-muted p-1"
                  onClick={() => fileInputRef.current?.click()}
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
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={profileData.name} onChange={handleInputChange} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={profileData.email} onChange={handleInputChange} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" value={profileData.department} onChange={handleInputChange} placeholder="e.g., Computer Science" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" name="institution" value={profileData.institution} placeholder="e.g., University of Example" className="mt-1" />
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
            
            <Button onClick={handleSaveChanges} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>

            <Button variant="outline" onClick={handleChangePassword} className="w-full">
              <Lock className="mr-2 h-4 w-4" /> Change Password
            </Button>
            
          </CardContent>
          <CardFooter>
             <Button variant="destructive" onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ClientAuthGuard>
  );
}
