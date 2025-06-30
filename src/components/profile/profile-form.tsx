"use client";

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { User, Save, Camera, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';

interface ProfileFormProps {
  initialData?: {
    name: string;
    email: string;
    department?: string;
    institution?: string;
    birthday?: Date | null;
    profilePicUrl?: string | null;
  };
}

const MAX_PROFILE_PIC_SIZE_BYTES = 1 * 1024 * 1024; // 1MB limit

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    department: initialData?.department || '',
    institution: initialData?.institution || '',
    birthday: initialData?.birthday || null,
    profilePicUrl: initialData?.profilePicUrl || null,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !initialData) {
      // If we have a user but no initialData, set defaults from user metadata
      setProfileData({
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        department: user.user_metadata?.department || '',
        institution: user.user_metadata?.institution || '',
        birthday: user.user_metadata?.birthday ? new Date(user.user_metadata.birthday) : null,
        profilePicUrl: user.user_metadata?.avatar_url || null,
      });
    }
  }, [user, initialData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setProfileData(prev => ({ ...prev, birthday: date || null }));
  };

  const handleProfilePicChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_PROFILE_PIC_SIZE_BYTES) {
      toast({
        title: "Image Too Large",
        description: `Please select an image smaller than ${(MAX_PROFILE_PIC_SIZE_BYTES / (1024*1024)).toFixed(1)}MB.`,
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      return;
    }

    try {
      // If user is authenticated, upload to Supabase Storage
      if (user) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `profile-pics/${fileName}`;
        
        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, file);
          
        if (error) {
          throw error;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);
          
        setProfileData(prev => ({ ...prev, profilePicUrl: publicUrl }));
      } else {
        // Fallback to base64 for non-authenticated users
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          if (base64String.length > MAX_PROFILE_PIC_SIZE_BYTES) {
            toast({
              title: "Profile Image Too Large",
              description: "The selected image is too large after encoding. Please choose a smaller image.",
              variant: "destructive",
            });
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
          } else {
            setProfileData(prev => ({ ...prev, profilePicUrl: base64String }));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Error handling profile picture:", error);
      toast({
        title: "Error Uploading Image",
        description: "There was a problem uploading your profile picture.",
        variant: "destructive",
      });
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    try {
      if (user) {
        // Update user metadata in Supabase Auth
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            name: profileData.name,
            department: profileData.department,
            institution: profileData.institution,
            birthday: profileData.birthday?.toISOString(),
            avatar_url: profileData.profilePicUrl,
          }
        });
        
        if (updateError) {
          throw updateError;
        }
        
        // Update user profile in database
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            name: profileData.name,
            email: profileData.email,
            department: profileData.department,
            institution: profileData.institution,
            birthday: profileData.birthday?.toISOString(),
            profile_pic_url: profileData.profilePicUrl,
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          throw profileError;
        }
      } else {
        // Fallback to localStorage for non-authenticated users
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
          if (profileData.profilePicUrl) {
            localStorage.setItem('userProfilePic', profileData.profilePicUrl);
          } else {
            localStorage.removeItem('userProfilePic');
          }
        }
      }
      
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      
      // Trigger storage event for components that listen to profile changes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ 
        title: "Error Saving Profile", 
        description: "There was a problem saving your profile changes.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
                src={profileData.profilePicUrl || "https://placehold.co/128x128.png"} 
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
          <p className="text-xs text-muted-foreground">Max image size: ~1MB. Larger images may not save.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              name="name" 
              value={profileData.name || ''} 
              onChange={handleInputChange} 
              className="mt-1" 
              disabled={isSaving} 
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              value={profileData.email || ''} 
              onChange={handleInputChange} 
              className="mt-1" 
              disabled={isSaving || !!user} // Disable email field if user is authenticated
            />
            {user && (
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed when using Google authentication.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Input 
              id="department" 
              name="department" 
              value={profileData.department || ''} 
              onChange={handleInputChange} 
              placeholder="e.g., Computer Science" 
              className="mt-1" 
              disabled={isSaving} 
            />
          </div>
          <div>
            <Label htmlFor="institution">Institution</Label>
            <Input 
              id="institution" 
              name="institution" 
              value={profileData.institution || ''} 
              onChange={handleInputChange} 
              placeholder="e.g., University of Example" 
              className="mt-1" 
              disabled={isSaving} 
            />
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
      </CardContent>
      <CardFooter className="flex justify-end space-x-3 p-6">
        <Button onClick={() => router.push('/dashboard')} variant="outline" disabled={isSaving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSaveChanges} 
          disabled={isSaving || !profileData.name.trim() || !profileData.email.trim()}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}