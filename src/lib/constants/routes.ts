export const ROUTES = {
  // Auth
  LOGIN: '/login',

  // Employee Routes
  DASHBOARD: '/',
  MY_ATTENDANCE: '/my-attendance',
  MY_LEAVES: '/my-leaves',
  LEAVE_BALANCES: '/leave-balances',
  REQUEST_LEAVE: '/request-leave',
  EDIT_PROFILE: '/edit-profile',

  // Admin Routes
  ADMIN_DASHBOARD: '/',
  MANAGE_DEPARTMENTS: '/manage-departments',
  MANAGE_EMPLOYEES: '/manage-employees',
  MANAGE_ATTENDANCE: '/manage-attendance',
  MANAGE_LEAVES: '/manage-leaves',
  MANAGE_LEAVE_TYPES: '/manage-leave-types',
  MANAGE_LEAVE_BALANCES: '/manage-leave-balances',
  SYSTEM_SETTINGS: '/system-settings',
  EMPLOYEE_TRACKING: '/employee-tracking',
} as const;