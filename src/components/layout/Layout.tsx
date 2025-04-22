import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { MobileMenuButton } from './MobileMenuButton';
import { UserProfile } from './UserProfile';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex flex-1">
        <MobileMenuButton isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />
        
        <div className={`${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-40 w-64 bg-white shadow-md transition-transform duration-300 ease-in-out h-full flex flex-col`}>
          <div className="h-16 flex items-center px-6">
            <h1 className="text-xl font-bold text-gray-900">HRMS</h1>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} onCloseMobileMenu={closeMobileMenu} />
          </div>
        </div>

        {/* Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={closeMobileMenu}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative bg-white shadow-sm">
            <Header toggleMobileMenu={toggleMobileMenu} />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <UserProfile />
            </div>
          </div>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}