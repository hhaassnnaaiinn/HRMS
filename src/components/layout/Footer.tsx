import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t py-4 px-6 mt-auto">
      <div className="flex items-center justify-center text-sm text-gray-600">
        <span>Made with</span>
        <Heart className="h-4 w-4 mx-1 text-red-500 fill-current" />
        <span>by Hasnain</span>
      </div>
    </footer>
  );
}