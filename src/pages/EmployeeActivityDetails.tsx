import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/config/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Monitor, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActivityData {
  id: string;
  employee_id: string;
  device_id: string;
  active_app: string;
  active_time: number;
  created_at: string;
  screenshot?: string;
}

export default function EmployeeActivityDetails() {
  const { employeeId, deviceId } = useParams();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityData();
    const interval = setInterval(fetchActivityData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [employeeId, deviceId]);

  const fetchActivityData = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('employee_activity')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching activity data:', error);
      setError(error.message || 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employee-tracking')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Devices
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Activity Details
          </h1>
        </div>
        <div className="text-sm text-gray-500">
          Auto-refreshes every 5 seconds
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Monitor className="h-6 w-6 text-gray-400" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Device {deviceId}
              </h2>
              <p className="text-sm text-gray-500">
                Employee ID: {employeeId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Screenshot
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {activity.active_app}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {activity.active_time} seconds
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {activity.screenshot ? (
                      <div className="relative">
                        <img
                          src={activity.screenshot}
                          alt="Activity Screenshot"
                          className="w-24 h-16 object-cover rounded shadow cursor-pointer"
                          onClick={() => setSelectedScreenshot(activity.screenshot)}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No screenshot</span>
                    )}
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No activity data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative bg-white rounded-lg p-2 max-w-4xl max-h-[90vh] overflow-auto">
            <img
              src={selectedScreenshot}
              alt="Full Screenshot"
              className="rounded"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg"
              onClick={() => setSelectedScreenshot(null)}
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}