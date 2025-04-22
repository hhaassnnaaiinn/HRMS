import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Users, Calendar, FileText, Settings, LogOut, ClipboardList, UserPlus, Clock, Building, Wallet, Menu, X, Heart } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useAdminStore } from '../stores/adminStore';
import { Button } from './ui/button';
import { useState } from 'react';

export default function Layout() {
  const { signOut } = useAuthStore();
  const { isAdmin } = useAdminStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const employeeNavigation = [
    { name: 'Dashboard', icon: Users, href: '/' },
    { name: 'My Attendance', icon: Calendar, href: '/my-attendance' },
    { name: 'My Leaves', icon: ClipboardList, href: '/my-leaves' },
    { name: 'Leave Balances', icon: Wallet, href: '/leave-balances' },
    { name: 'Request Leave', icon: FileText, href: '/request-leave' },
  ];

  const adminNavigation = [
    { name: 'Dashboard', icon: Users, href: '/' },
    { name: 'Manage Departments', icon: Building, href: '/manage-departments' },
    { name: 'Manage Employees', icon: UserPlus, href: '/manage-employees' },
    { name: 'Manage Attendance', icon: Clock, href: '/manage-attendance' },
    { name: 'Manage Leaves', icon: ClipboardList, href: '/manage-leaves' },
    { name: 'Leave Types', icon: FileText, href: '/manage-leave-types' },
    { name: 'Leave Balances', icon: Wallet, href: '/manage-leave-balances' },
    { name: 'System Settings', icon: Settings, href: '/system-settings' },
  ];

  const navigation = isAdmin ? adminNavigation : employeeNavigation;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex flex-1">
        {/* Mobile menu button */}
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-lg"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>

        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:relative z-40 w-64 bg-white shadow-md transition-transform duration-300 ease-in-out h-full`}
        >
          <div className="h-16 flex items-center px-6">
            <h1 className="text-xl font-bold text-gray-900">HRMS</h1>
          </div>
          <nav className="mt-6 pb-24 lg:pb-16 overflow-y-auto h-full">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 ${
                    isActive ? 'bg-blue-50 text-blue-600' : ''
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="absolute bottom-0 w-64 p-4 bg-white border-t">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-center"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white shadow-sm flex items-center px-4 lg:px-6">
            <div className="ml-16 lg:ml-0">
              <h2 className="text-xl font-semibold text-gray-800">
                {isAdmin ? 'Admin Portal' : 'Employee Portal'}
              </h2>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
          {/* Footer */}
          <footer className="bg-white border-t py-4 px-6 mt-auto">
            <div className="flex items-center justify-center text-sm text-gray-600">
              <span>Made with</span>
              <Heart className="h-4 w-4 mx-1 text-red-500 fill-current" />
              <span>by Hasnain</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}