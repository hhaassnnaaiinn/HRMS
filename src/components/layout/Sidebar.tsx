import { NavLink } from 'react-router-dom';
import { useAdminStore } from '@/stores/adminStore';
import { ADMIN_NAVIGATION, EMPLOYEE_NAVIGATION } from '@/lib/constants/navigation';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

export function Sidebar({ isMobileMenuOpen, onCloseMobileMenu }: SidebarProps) {
  const { isAdmin } = useAdminStore();
  const navigation = isAdmin ? ADMIN_NAVIGATION : EMPLOYEE_NAVIGATION;

  return (
    <nav className="mt-6">
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          onClick={onCloseMobileMenu}
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
  );
}