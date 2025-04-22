import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/config/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Monitor, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmployeeDevice {
  employee_id: string;
  device_id: string;
  last_active: string;
  total_activities: number;
}

export default function EmployeeTracking() {
  const navigate = useNavigate();
  const [employeeDevices, setEmployeeDevices] = useState<EmployeeDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployeeDevices();
    const interval = setInterval(fetchEmployeeDevices, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchEmployeeDevices = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('employee_activity')
        .select('employee_id, device_id, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Group and process the data
      const deviceMap = new Map<string, EmployeeDevice>();
      
      data?.forEach(activity => {
        const key = `${activity.employee_id}-${activity.device_id}`;
        if (!deviceMap.has(key)) {
          deviceMap.set(key, {
            employee_id: activity.employee_id,
            device_id: activity.device_id,
            last_active: activity.created_at,
            total_activities: 1
          });
        } else {
          const existing = deviceMap.get(key)!;
          existing.total_activities++;
        }
      });

      setEmployeeDevices(Array.from(deviceMap.values()));
    } catch (error: any) {
      console.error('Error fetching employee devices:', error);
      setError(error.message || 'Failed to fetch employee devices');
    } finally {
      setLoading(false);
    }
  };

  const viewActivity = (employeeId: string, deviceId: string) => {
    navigate(`/employee-tracking/${employeeId}/${deviceId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Employee Devices</h1>
        <div className="text-sm text-gray-500">
          Auto-refreshes every 30 seconds
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employeeDevices.map((device) => (
          <div
            key={`${device.employee_id}-${device.device_id}`}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Monitor className="h-6 w-6 text-gray-400" />
                  <h3 className="ml-2 text-lg font-medium text-gray-900">
                    Device {device.device_id}
                  </h3>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Employee ID:</span>
                  <span className="ml-2 text-sm text-gray-900">{device.employee_id}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Last Active:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {new Date(device.last_active).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Total Activities:</span>
                  <span className="ml-2 text-sm text-gray-900">{device.total_activities}</span>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50">
              <Button
                className="w-full flex items-center justify-center"
                onClick={() => viewActivity(device.employee_id, device.device_id)}
              >
                View Activity
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {employeeDevices.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <Monitor className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No devices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No employee activity has been recorded yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}