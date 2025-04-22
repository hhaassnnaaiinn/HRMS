import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Calendar } from 'lucide-react';

interface LeaveBalance {
  id: string;
  total_days: number;
  used_days: number;
  year: number;
  leave_type: {
    id: string;
    name: string;
    description: string;
    is_paid: boolean;
    default_days: number;
  };
}

export default function LeaveBalances() {
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchLeaveBalances();
  }, []);

  async function fetchLeaveBalances() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get employee ID
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (employeeError) throw employeeError;

      // Fetch leave balances with leave type details
      const { data: balancesData, error: balancesError } = await supabase
        .from('leave_balances')
        .select(`
          id,
          total_days,
          used_days,
          year,
          leave_type:leave_types (
            id,
            name,
            description,
            is_paid,
            default_days
          )
        `)
        .eq('employee_id', employeeData.id)
        .eq('year', currentYear);

      if (balancesError) throw balancesError;
      setLeaveBalances(balancesData || []);
    } catch (error: any) {
      console.error('Error fetching leave balances:', error);
      setError(error.message || 'Failed to fetch leave balances');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (leaveBalances.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No leave balance information found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">My Leave Balances</h1>
        <div className="text-sm text-gray-500">
          Year: {currentYear}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {leaveBalances.map((balance, index) => (
          <div
            key={balance.id}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">
                    {index + 1}.
                  </span>
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {balance.leave_type.name}
                    </dt>
                    <dd className="mt-1 text-lg font-medium text-gray-900">
                      {balance.total_days - balance.used_days} days remaining
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Total: {balance.total_days} days</span>
                  <span>Used: {balance.used_days} days</span>
                </div>
                {balance.leave_type.is_paid && (
                  <span className="inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Paid Leave
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}