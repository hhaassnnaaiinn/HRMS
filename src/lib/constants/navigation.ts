import { Users, Calendar, FileText, Settings, ClipboardList, UserPlus, Clock, Building, Wallet, Monitor } from 'lucide-react';
import { ROUTES } from './routes';

export const EMPLOYEE_NAVIGATION = [
  { name: 'Dashboard', icon: Users, href: ROUTES.DASHBOARD },
  { name: 'My Attendance', icon: Calendar, href: ROUTES.MY_ATTENDANCE },
  { name: 'My Leaves', icon: ClipboardList, href: ROUTES.MY_LEAVES },
  { name: 'Leave Balances', icon: Wallet, href: ROUTES.LEAVE_BALANCES },
  { name: 'Request Leave', icon: FileText, href: ROUTES.REQUEST_LEAVE },
];

export const ADMIN_NAVIGATION = [
  { name: 'Dashboard', icon: Users, href: ROUTES.ADMIN_DASHBOARD },
  { name: 'Manage Departments', icon: Building, href: ROUTES.MANAGE_DEPARTMENTS },
  { name: 'Manage Employees', icon: UserPlus, href: ROUTES.MANAGE_EMPLOYEES },
  { name: 'Manage Attendance', icon: Clock, href: ROUTES.MANAGE_ATTENDANCE },
  { name: 'Manage Leaves', icon: ClipboardList, href: ROUTES.MANAGE_LEAVES },
  { name: 'Leave Types', icon: FileText, href: ROUTES.MANAGE_LEAVE_TYPES },
  { name: 'Leave Balances', icon: Wallet, href: ROUTES.MANAGE_LEAVE_BALANCES },
  { name: 'Employee Tracking', icon: Monitor, href: ROUTES.EMPLOYEE_TRACKING },
  { name: 'System Settings', icon: Settings, href: ROUTES.SYSTEM_SETTINGS },
];