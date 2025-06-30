"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileForm } from '@/components/profile/profile-form';
import { Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        // Try to fetch user profile from Supabase
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          console.error("Error fetching user profile:", error);
          // Fallback to user metadata
          setProfileData({
            name: user.user_metadata?.name || user.email?.split('@')[0] || '',
            email: user.email || '',
            department: user.user_metadata?.department || '',
            institution: user.user_metadata?.institution || '',
            birthday: user.user_metadata?.birthday ? new Date(user.user_metadata.birthday) : null,
            profilePicUrl: user.user_metadata?.avatar_url || null,
          });
        } else if (data) {
          setProfileData({
            name: data.name,
            email: data.email,
            department: data.department || '',
            institution: data.institution || '',
            birthday: data.birthday ? new Date(data.birthday) : null,
            profilePicUrl: data.profile_pic_url || null,
          });
        }
      } catch (error) {
        console.error("Error in profile data fetch:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, authLoading, router]);

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <ProfileForm initialData={profileData} />
    </div>
  );
}