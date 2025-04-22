import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Clock, Calendar, FileText } from 'lucide-react';

interface EmployeeStats {
  totalLeaves: number;
  pendingRequests: number;
  presentDays: number;
  absentDays: number;
}

interface RecentActivity {
  type: 'attendance' | 'leave';
  date: string;
  status: string;
  details?: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmployeeStats>({
    totalLeaves: 0,
    pendingRequests: 0,
    presentDays: 0,
    absentDays: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  async function fetchEmployeeData() {
    try {
      setLoading(true);
      
      // Get current user's auth ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get employee record
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!employeeData) return;

      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Fetch attendance stats for current month
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('employee_id', employeeData.id)
        .gte('date', firstDayOfMonth.toISOString())
        .lte('date', lastDayOfMonth.toISOString());

      // Fetch leave requests
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeData.id);

      // Calculate stats
      const presentDays = attendanceData?.filter(a => a.status === 'present').length || 0;
      const absentDays = attendanceData?.filter(a => a.status === 'absent').length || 0;
      const pendingRequests = leaveData?.filter(l => l.status === 'pending').length || 0;
      const totalLeaves = leaveData?.filter(l => l.status === 'approved').length || 0;

      setStats({
        presentDays,
        absentDays,
        pendingRequests,
        totalLeaves,
      });

      // Fetch recent activity
      const [recentAttendance, recentLeaves] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', employeeData.id)
          .order('date', { ascending: false })
          .limit(5),
        supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employeeData.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const activity: RecentActivity[] = [
        ...(recentAttendance.data || []).map(a => ({
          type: 'attendance' as const,
          date: a.date,
          status: a.status,
          details: `${new Date(a.check_in).toLocaleTimeString()} - ${a.check_out ? new Date(a.check_out).toLocaleTimeString() : 'Not checked out'}`
        })),
        ...(recentLeaves.data || []).map(l => ({
          type: 'leave' as const,
          date: l.start_date,
          status: l.status,
          details: `${l.leave_type} (${new Date(l.start_date).toLocaleDateString()} - ${new Date(l.end_date).toLocaleDateString()})`
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecentActivity(activity);

      // Fetch upcoming approved leaves
      const { data: upcomingLeavesData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeData.id)
        .eq('status', 'approved')
        .gte('start_date', new Date().toISOString())
        .order('start_date')
        .limit(3);

      setUpcomingLeaves(upcomingLeavesData || []);

    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Present Days
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.presentDays}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="font-medium text-green-600">
                {((stats.presentDays / (stats.presentDays + stats.absentDays)) * 100).toFixed(1)}%
              </span>
              <span className="text-gray-500"> attendance rate</span>
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
                    Total Leaves
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalLeaves}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500">This year</span>
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
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500">Awaiting approval</span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Absent Days
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.absentDays}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500">This month</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Recent Activity
            </h3>
          </div>
          <div className="px-6 py-5">
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivity.map((activity, index) => (
                  <li key={index} className="relative pb-8">
                    {index !== recentActivity.length - 1 && (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          activity.type === 'attendance' ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {activity.type === 'attendance' ? (
                            <Clock className="h-5 w-5 text-white" />
                          ) : (
                            <Calendar className="h-5 w-5 text-white" />
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-900">
                              {activity.type === 'attendance' ? 'Attendance' : 'Leave Request'}
                            </span>
                            {' - '}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              activity.status === 'present' || activity.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : activity.status === 'absent' || activity.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {activity.status}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {activity.details}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Upcoming Leaves
            </h3>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-4">
              {upcomingLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {leave.leave_type}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {upcomingLeaves.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No upcoming leaves scheduled
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}