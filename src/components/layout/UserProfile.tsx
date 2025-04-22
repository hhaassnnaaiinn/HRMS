import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/config/supabase';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/lib/constants/routes';

interface UserData {
  first_name: string;
  last_name: string;
  email?: string;
  avatar_url?: string;
}

export function UserProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.user-profile-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('first_name, last_name, email, avatar_url')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setUserData(data);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      setError(error.message);
    }
  };

  return (
    <div className="relative user-profile-dropdown">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 focus:outline-none"
      >
        <div className="relative">
          {userData?.avatar_url ? (
            <img
              src={userData.avatar_url}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {userData?.first_name} {userData?.last_name}
        </span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium text-gray-900">
              {userData?.first_name} {userData?.last_name}
            </p>
            {error && (
              <div className="text-xs text-red-500 mt-1">
                {error}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setShowDropdown(false);
              navigate(ROUTES.EDIT_PROFILE);
            }}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Profile
          </button>

          <button
            onClick={() => signOut()}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}