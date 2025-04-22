import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Calendar, Download, Clock, AlertCircle } from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { DateTime } from "luxon";


interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  departments?: {
    name: string;
  };
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'half-day' | 'remote' | 'leave' | 'late' | 'wfh';
  remarks?: string;
  shift_id: string;
}

interface ShiftConfig {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  is_ramadan: boolean;
  is_active: boolean;
}

function ManageAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftConfig | null>(null);
  const [markingAttendance, setMarkingAttendance] = useState<{
    employeeId: string;
    status?: 'present' | 'absent' | 'half-day' | 'remote' | 'wfh';
    checkInTime?: string;
    checkOutTime?: string;
  } | null>(null);

  const fetchEmployees = async (page: number, pageSize: number) => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        email,
        position,
        departments (
          name
        )
      `)
      .eq('is_active', true)
      .order('first_name')
      .range(start, end);

    return data || [];
  };

  const {
    data: employees,
    loading: employeesLoading,
    ref,
    hasMore,
  } = useInfiniteScroll<Employee>({
    fetchData: fetchEmployees,
    pageSize: 10
  });

  useEffect(() => {
    fetchActiveShift();
  }, []);

  useEffect(() => {
    fetchAttendanceAndLeaves();
  }, [selectedDate]);

  useEffect(() => {
    if (activeShift && markingAttendance && !markingAttendance.checkInTime) {
      setMarkingAttendance(prev => ({
        ...prev!,
        checkInTime: activeShift.start_time,
        checkOutTime: activeShift.end_time
      }));
    }
  }, [activeShift, markingAttendance]);

  async function fetchActiveShift() {
    try {
      const { data: shiftData, error: shiftError } = await supabase
        .from('shift_configs')
        .select('*')
        .eq('is_active', true)
        .order('is_ramadan', { ascending: false })
        .limit(1)
        .single();

      if (shiftError) throw shiftError;
      setActiveShift(shiftData);
    } catch (error) {
      console.error('Error fetching active shift:', error);
      setError('Failed to fetch shift configuration');
    }
  }

  async function fetchAttendanceAndLeaves() {
    try {
      // Fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate);

      if (attendanceError) throw attendanceError;

      // Fetch approved leaves for the selected date
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('employee_id')
        .eq('status', 'approved')
        .lte('start_date', selectedDate)
        .gte('end_date', selectedDate);

      if (leaveError) throw leaveError;

      // Create attendance records for employees on approved leave
      const leaveAttendance = leaveData?.map(leave => ({
        id: `leave-${leave.employee_id}`,
        employee_id: leave.employee_id,
        date: selectedDate,
        check_in: null,
        check_out: null,
        status: 'leave' as const,
        remarks: 'On approved leave'
      }));

      // Combine attendance and leave records
      setAttendance([...(attendanceData || []), ...(leaveAttendance || [])]);
    } catch (error) {
      console.error('Error fetching attendance and leaves:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setMarkingAttendance(null);
    setError(null);
  };

  const isCurrentDay = (date: string) => {
    return date === new Date().toISOString().split('T')[0];
  };

  const getMinutesFromTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const determineStatus = (checkInTime: string, checkOutTime?: string): 'present' | 'late' | 'half-day' => {
    if (!activeShift) return 'present';

    const shiftStartMinutes = getMinutesFromTime(activeShift.start_time);
    const shiftEndMinutes = getMinutesFromTime(activeShift.end_time);
    const checkInMinutes = getMinutesFromTime(checkInTime);
    
    // Calculate minutes after shift start
    let minutesLate = checkInMinutes - shiftStartMinutes;
    if (minutesLate < -720) { // Handle cases crossing midnight
      minutesLate += 1440; // Add 24 hours in minutes
    }

    // If check-in is after grace period
    if (minutesLate > activeShift.grace_minutes) {
      // If check-in is after 12:00 PM, mark as half-day
      if (checkInMinutes >= 720) { // 12:00 PM = 720 minutes
        return 'half-day';
      }
      return 'late';
    }

    // If check-out time exists, check for early departure
    if (checkOutTime) {
      const checkOutMinutes = getMinutesFromTime(checkOutTime);
      let workDuration = checkOutMinutes - checkInMinutes;
      if (workDuration < 0) {
        workDuration += 1440; // Add 24 hours in minutes
      }

      let expectedDuration = shiftEndMinutes - shiftStartMinutes;
      if (expectedDuration < 0) {
        expectedDuration += 1440;
      }

      // If working less than 4 hours before expected end time, mark as half-day
      if ((expectedDuration - workDuration) >= 240) { // 4 hours = 240 minutes
        return 'half-day';
      }
    }

    return 'present';
  };

  const handleMarkAttendance = async (employeeId: string) => {
    if (!isCurrentDay(selectedDate)) {
      setError('Attendance can only be marked for the current day');
      return;
    }

    if (!markingAttendance?.status) {
      setError('Please select an attendance status');
      return;
    }

    try {
      setError(null);

      if (!activeShift) {
        throw new Error('No active shift configuration found');
      }

      const attendanceData: any = {
        employee_id: employeeId,
        date: selectedDate,
        status: markingAttendance.status,
        shift_id: activeShift.id
      };

      // Only set check-in/check-out times for present/late/half-day status
      if (['present', 'late', 'half-day'].includes(markingAttendance.status)) {
        // Use provided check-in time
        if (!markingAttendance.checkInTime) {
          throw new Error('Check-in time is required');
        }

        // Determine actual status based on times
        const actualStatus = determineStatus(
          markingAttendance.checkInTime,
          markingAttendance.checkOutTime
        );

        attendanceData.status = actualStatus;
        attendanceData.check_in = `${selectedDate}T${markingAttendance.checkInTime}`;

        // Use provided check-out time if exists
        if (markingAttendance.checkOutTime) {
          attendanceData.check_out = `${selectedDate}T${markingAttendance.checkOutTime}`;
        }
      }

      const { error: attendanceError } = await supabase
        .from('attendance')
        .insert([attendanceData]);

      if (attendanceError) {
        throw attendanceError;
      }
      
      setMarkingAttendance(null);
      await fetchAttendanceAndLeaves();
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      setError(error.message || 'Failed to mark attendance');
    }
  };

  const handleExport = async () => {
    try {
      const { data: exportData, error: exportError } = await supabase
        .from('attendance')
        .select(`
          date,
          check_in,
          check_out,
          status,
          employees (
            first_name,
            last_name,
            email,
            departments (
              name
            )
          )
        `)
        .eq('date', selectedDate);

      if (exportError) throw exportError;

      // Create CSV content
      const csvContent = [
        ['Date', 'Employee', 'Department', 'Status', 'Check In', 'Check Out'].join(','),
        ...exportData.map(record => [
          record.date,
          `${record.employees.first_name} ${record.employees.last_name}`,
          record.employees.departments?.name || '-',
          record.status,
          record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-',
          record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-'
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${selectedDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting attendance:', error);
      setError(error.message || 'Failed to export attendance data');
    }
  };

  const getAttendanceRecord = (employeeId: string) => {
    return attendance.find(a => a.employee_id === employeeId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'half-day':
        return 'bg-yellow-100 text-yellow-800';
      case 'remote':
        return 'bg-blue-100 text-blue-800';
      case 'leave':
        return 'bg-purple-100 text-purple-800';
      case 'late':
        return 'bg-orange-100 text-orange-800';
      case 'wfh':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

const formatTime = (time) => {
  const date = new Date(time);
  const hours = date.getUTCHours(); // UTC ka hour as it is
  const minutes = date.getUTCMinutes(); // UTC ka minute as it is
  
  return `${(hours % 12) || 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};





  const shouldShowTimeFields = (status?: string) => {
    return ['present', 'late', 'half-day'].includes(status || '');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Manage Attendance</h1>
        <div className="flex items-center space-x-4">
          <Button onClick={handleExport} className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Calendar className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {!isCurrentDay(selectedDate) && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-blue-700">
              You are viewing attendance for {new Date(selectedDate).toLocaleDateString()}. 
              Attendance can only be marked for the current day.
            </span>
          </div>
        </div>
      )}

      {activeShift && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-gray-700">
              Active Shift: {activeShift.name} ({activeShift.start_time} - {activeShift.end_time})
              {' | '}Grace Period: {activeShift.grace_minutes} minutes
              {activeShift.is_ramadan && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Ramadan
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check In
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check Out
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => {
              const record = getAttendanceRecord(employee.id);
              const isMarking = markingAttendance?.employeeId === employee.id;
              const canMarkAttendance = isCurrentDay(selectedDate) && !record;
              const showTimeFields = shouldShowTimeFields(markingAttendance?.status);

              return (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.departments?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record ? (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    ) : isMarking ? (
                      <select
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={markingAttendance.status}
                        onChange={(e) => setMarkingAttendance({
                          ...markingAttendance,
                          status: e.target.value as 'present' | 'absent' | 'half-day' | 'remote' | 'wfh'
                        })}
                      >
                        <option value="">Select Status</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half-day">Half Day</option>
                        <option value="remote">Remote</option>
                        <option value="wfh">Work From Home</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-500">Not Marked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isMarking && showTimeFields ? (
                      <input
                        type="time"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={markingAttendance.checkInTime}
                        onChange={(e) => setMarkingAttendance({
                          ...markingAttendance,
                          checkInTime: e.target.value
                        })}
                      />
                    ) : (
                      shouldShowTimeFields(record?.status) ? formatTime(record?.check_in) : '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isMarking && showTimeFields ? (
                      <input
                        type="time"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={markingAttendance.checkOutTime}
                        onChange={(e) => setMarkingAttendance({
                          ...markingAttendance,
                          checkOutTime: e.target.value
                        })}
                      />
                    ) : (
                      shouldShowTimeFields(record?.status) ? formatTime(record?.check_out) : '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {canMarkAttendance ? (
                        isMarking ? (
                          <>
                            <Button
                              onClick={() => handleMarkAttendance(employee.id)}
                              className="flex items-center"
                              size="sm"
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setMarkingAttendance(null)}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => setMarkingAttendance({ employeeId: employee.id })}
                            className="flex items-center"
                            size="sm"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Mark Attendance
                          </Button>
                        )
                      ) : (
                        <Button
                          disabled
                          variant="outline"
                          size="sm"
                        >
                          {record ? 'Marked' : 'Not Available'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {employeesLoading && <LoadingSpinner />}
        {hasMore && <div ref={ref} className="h-10" />}
      </div>
    </div>
  );
}

export default ManageAttendance;