import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../stores/adminStore';
import { Button } from '../components/ui/button';
import { Users, UserPlus, Calendar, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingRequests: 0
  });
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);
      const today = new Date().toISOString().split('T')[0];

      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact' });

      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .eq('date', today)
        .eq('status', 'present');

      const { count: leaveCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact' })
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      const { data: pendingRequests, error: pendingError } = await supabase
        .from('leave_requests')
        .select(`
          id,
          start_date,
          end_date,
          leave_type:leave_types (
            id,
            name
          ),
          reason,
          employees (
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      setStats({
        totalEmployees: employeeCount || 0,
        presentToday: presentCount || 0,
        onLeave: leaveCount || 0,
        pendingRequests: pendingRequests?.length || 0
      });

      setPendingLeaves(pendingRequests || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const handleApproveLeave = async (leaveId: string) => {
    try {
      setError(null);
      if (!leaveId) {
        throw new Error('Invalid leave request ID');
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: 'approved' })
        .filter('id', 'eq', leaveId);

      if (updateError) throw updateError;
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Error approving leave:', error);
      setError(error.message || 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    try {
      setError(null);
      if (!leaveId) {
        throw new Error('Invalid leave request ID');
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected' })
        .filter('id', 'eq', leaveId);

      if (updateError) throw updateError;
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Error rejecting leave:', error);
      setError(error.message || 'Failed to reject leave request');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Employees
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalEmployees}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Present Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.presentToday}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserPlus className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    On Leave
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.onLeave}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Pending Leave Requests
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingLeaves.map((leave: any, index: number) => (
              <div key={leave.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 mr-4">
                      {index + 1}.
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {leave.employees.first_name} {leave.employees.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {leave.leave_type?.name} - {leave.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleApproveLeave(leave.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleRejectLeave(leave.id)}
                      variant="destructive"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {pendingLeaves.length === 0 && (
              <div className="px-6 py-4 text-center text-gray-500">
                No pending leave requests
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}