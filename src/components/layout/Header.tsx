import { useAdminStore } from '@/stores/adminStore';

interface HeaderProps {
  toggleMobileMenu: () => void;
}

export function Header({ toggleMobileMenu }: HeaderProps) {
  const { isAdmin } = useAdminStore();

  return (
    <div className="h-16 flex items-center px-4 lg:px-6">
      <div className="ml-16 lg:ml-0">
        <h2 className="text-xl font-semibold text-gray-800">
          {isAdmin ? 'Admin Portal' : 'Employee Portal'}
        </h2>
      </div>
    </div>
  );
}