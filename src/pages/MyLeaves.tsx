import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: {
    id: string;
    name: string;
    is_paid: boolean;
  };
  status: string;
  reason: string;
}

export default function MyLeaves() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  async function fetchLeaves() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (employeeError) throw employeeError;
      if (!employeeData) throw new Error('Employee not found');

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          id,
          start_date,
          end_date,
          status,
          reason,
          leave_type:leave_types!leave_requests_leave_type_id_fkey (
            id,
            name,
            is_paid
          )
        `)
        .eq('employee_id', employeeData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (error: any) {
      console.error('Error fetching leaves:', error);
      setError(error.message || 'Failed to fetch leave history');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">My Leave History</h1>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {leaves.map((leave, index) => (
            <li key={leave.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 mr-4">
                      {index + 1}.
                    </span>
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-500">
                          {leave.leave_type?.name || 'Unknown Leave Type'}
                        </span>
                        {leave.leave_type && (
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            leave.leave_type.is_paid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {leave.leave_type.is_paid ? 'Paid' : 'Unpaid'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  </div>
                </div>
                {leave.reason && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Reason: {leave.reason}
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
          {leaves.length === 0 && (
            <li>
              <div className="px-4 py-8 text-center text-gray-500">
                No leave requests found
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}