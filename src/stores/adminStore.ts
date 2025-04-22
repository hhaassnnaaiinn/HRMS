import { create } from 'zustand';
import { supabase } from '@/lib/config/supabase';

interface AdminState {
  isAdmin: boolean;
  checkAdminStatus: () => Promise<void>;
  createEmployee: (employeeData: any) => Promise<void>;
  updateEmployee: (employeeId: string, employeeData: any) => Promise<void>;
  markAttendance: (employeeId: string, status: 'present' | 'absent' | 'half-day') => Promise<void>;
  approveLeave: (leaveId: string) => Promise<void>;
  rejectLeave: (leaveId: string) => Promise<void>;
  updateLeaveBalance: (balanceId: string, totalDays: number) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  isAdmin: false,

  checkAdminStatus: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return set({ isAdmin: false });

      const { data: employee } = await supabase
        .from('employees')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      set({ isAdmin: employee?.role === 'admin' });
    } catch (error) {
      console.error('Error checking admin status:', error);
      set({ isAdmin: false });
    }
  },

  createEmployee: async (employeeData) => {
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: employeeData.email,
      password: employeeData.password,
    });

    if (authError) throw authError;

    const { error: employeeError } = await supabase
      .from('employees')
      .insert([{
        user_id: authUser.user?.id,
        first_name: employeeData.firstName,
        last_name: employeeData.lastName,
        email: employeeData.email,
        phone: employeeData.phone || null,
        department_id: employeeData.departmentId || null,
        position: employeeData.position,
        hire_date: employeeData.hireDate,
        probation_end_date: employeeData.probationEndDate,
        is_permanent: false,
        role: 'employee'
      }]);

    if (employeeError) throw employeeError;
  },

  updateEmployee: async (employeeId, employeeData) => {
    // Calculate permanent status based on probation end date
    const probationEndDate = new Date(employeeData.probationEndDate);
    const currentDate = new Date();
    const isPermanent = probationEndDate < currentDate;

    const { error: employeeError } = await supabase
      .from('employees')
      .update({
        first_name: employeeData.firstName,
        last_name: employeeData.lastName,
        phone: employeeData.phone || null,
        department_id: employeeData.departmentId || null,
        position: employeeData.position,
        hire_date: employeeData.hireDate,
        probation_end_date: employeeData.probationEndDate,
        is_permanent: isPermanent
      })
      .eq('id', employeeId);

    if (employeeError) throw employeeError;
  },

  markAttendance: async (employeeId, status) => {
    const { error } = await supabase
      .from('attendance')
      .insert([{
        employee_id: employeeId,
        date: new Date().toISOString().split('T')[0],
        check_in: new Date().toISOString(),
        status
      }]);

    if (error) throw error;
  },

  approveLeave: async (leaveId) => {
    if (!leaveId) throw new Error('Leave ID is required');
    
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'approved' })
      .eq('id', leaveId);

    if (error) throw error;
  },

  rejectLeave: async (leaveId) => {
    if (!leaveId) throw new Error('Leave ID is required');
    
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'rejected' })
      .eq('id', leaveId);

    if (error) throw error;
  },

  updateLeaveBalance: async (balanceId, totalDays) => {
    const { error } = await supabase
      .from('leave_balances')
      .update({ total_days: totalDays })
      .eq('id', balanceId);

    if (error) throw error;
  }
}));