import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/config/supabase';
import { Button } from '@/components/ui/button';
import { Clock, Save, Settings, Globe } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DateTime } from 'luxon';
import { getSystemTimezone } from '@/lib/utils/date';

interface ShiftConfig {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  is_ramadan: boolean;
  is_active: boolean;
}

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [editingShift, setEditingShift] = useState<ShiftConfig | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState(getSystemTimezone());
  const [showForm, setShowForm] = useState(false);
  const [currentTime, setCurrentTime] = useState(
    DateTime.now().setZone(selectedTimezone).toFormat('yyyy-MM-dd HH:mm:ss')
  );

  const [newShift, setNewShift] = useState<Partial<ShiftConfig>>({
    name: '',
    start_time: '09:00',
    end_time: '18:00',
    grace_minutes: 15,
    is_ramadan: false,
    is_active: true
  });

  useEffect(() => {
    fetchShifts();
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(DateTime.now().setZone(selectedTimezone).toFormat('yyyy-MM-dd HH:mm:ss'));
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedTimezone]);

  async function fetchShifts() {
    try {
      setLoading(true);
      const { data: shiftData, error: shiftError } = await supabase
        .from('shift_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (shiftError) throw shiftError;
      setShifts(shiftData || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      setError('Failed to fetch shift configurations');
    } finally {
      setLoading(false);
    }
  }

  async function handleShiftSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      
      if (editingShift) {
        const { error: updateError } = await supabase
          .from('shift_configs')
          .update({
            name: newShift.name,
            start_time: newShift.start_time,
            end_time: newShift.end_time,
            grace_minutes: newShift.grace_minutes,
            is_ramadan: newShift.is_ramadan,
            is_active: newShift.is_active
          })
          .eq('id', editingShift.id);

        if (updateError) throw updateError;
      } else {
        const { error: createError } = await supabase
          .from('shift_configs')
          .insert([{
            name: newShift.name,
            start_time: newShift.start_time,
            end_time: newShift.end_time,
            grace_minutes: newShift.grace_minutes,
            is_ramadan: newShift.is_ramadan,
            is_active: newShift.is_active
          }]);

        if (createError) throw createError;
      }

      setEditingShift(null);
      setShowForm(false);
      resetShiftForm();
      fetchShifts();
    } catch (error: any) {
      console.error('Error saving shift:', error);
      setError(error.message || 'Failed to save shift configuration');
    }
  }

  function handleTimezoneChange(timezone: string) {
    try {
      // Validate timezone
      const testDate = DateTime.now().setZone(timezone);
      if (!testDate.isValid) {
        throw new Error('Invalid timezone');
      }

      // Save to localStorage
      localStorage.setItem('systemTimezone', timezone);
      setSelectedTimezone(timezone);

      // Update current time display
      setCurrentTime(DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd HH:mm:ss'));
    } catch (error) {
      console.error('Error setting timezone:', error);
      setError('Failed to set timezone. Please try again.');
    }
  }

  async function handleDeleteShift(shiftId: string) {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('shift_configs')
        .delete()
        .eq('id', shiftId);

      if (deleteError) throw deleteError;
      fetchShifts();
    } catch (error: any) {
      console.error('Error deleting shift:', error);
      setError(error.message || 'Failed to delete shift configuration');
    }
  }

  function handleEditShift(shift: ShiftConfig) {
    setEditingShift(shift);
    setNewShift({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      grace_minutes: shift.grace_minutes,
      is_ramadan: shift.is_ramadan,
      is_active: shift.is_active
    });
    setShowForm(true);
  }

  async function toggleShiftActive(shiftId: string, isActive: boolean) {
    try {
      setError(null);
      const { error: shiftError } = await supabase
        .from('shift_configs')
        .update({ is_active: isActive })
        .eq('id', shiftId);

      if (shiftError) throw shiftError;
      fetchShifts();
    } catch (error: any) {
      console.error('Error updating shift:', error);
      setError(error.message || 'Failed to update shift configuration');
    }
  }

  function resetShiftForm() {
    setNewShift({
      name: '',
      start_time: '09:00',
      end_time: '18:00',
      grace_minutes: 15,
      is_ramadan: false,
      is_active: true
    });
  }

  // Get list of all supported timezones
  const timezones = Intl.supportedValuesOf('timeZone');

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">System Settings</h1>
        <Button onClick={() => setShowForm(!showForm)} className="md:hidden">
          {showForm ? 'View Shifts' : 'Add Shift'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex items-center mb-6">
            <Globe className="h-6 w-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">
              Timezone Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                System Timezone
              </label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={selectedTimezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
              >
                {timezones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Current time: {currentTime}
              </p>
            </div>
          </div>
        </div>

        <div className={`bg-white shadow rounded-lg p-4 sm:p-6 ${showForm ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Settings className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">
                {editingShift ? 'Edit Shift' : 'Add New Shift'}
              </h2>
            </div>
          </div>

          <form onSubmit={handleShiftSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Shift Name
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={newShift.name || ''}
                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                placeholder="e.g., Morning Shift"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Grace Period (minutes)
              </label>
              <input
                type="number"
                required
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={newShift.grace_minutes || 15}
                onChange={(e) => setNewShift({ ...newShift, grace_minutes: parseInt(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={newShift.start_time || '09:00'}
                  onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={newShift.end_time || '18:00'}
                  onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_ramadan"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={newShift.is_ramadan || false}
                  onChange={(e) => setNewShift({ ...newShift, is_ramadan: e.target.checked })}
                />
                <label htmlFor="is_ramadan" className="ml-2 text-sm text-gray-700">
                  Ramadan Shift
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={newShift.is_active || false}
                  onChange={(e) => setNewShift({ ...newShift, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              {editingShift && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingShift(null);
                    resetShiftForm();
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {editingShift ? 'Update Shift' : 'Add Shift'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className={`bg-white shadow rounded-lg p-4 sm:p-6 ${showForm ? 'hidden md:block' : 'block'}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Shifts</h3>
        <div className="space-y-4">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-gray-50 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center space-x-4">
                <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">{shift.name}</h4>
                  <p className="text-sm text-gray-500">
                    {shift.start_time} - {shift.end_time}
                    <br className="sm:hidden" />
                    <span className="hidden sm:inline"> | </span>
                    Grace Period: {shift.grace_minutes} minutes
                    {shift.is_ramadan && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Ramadan
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  variant={shift.is_active ? "default" : "outline"}
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => toggleShiftActive(shift.id, !shift.is_active)}
                >
                  {shift.is_active ? 'Active' : 'Inactive'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => handleEditShift(shift)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => handleDeleteShift(shift.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {shifts.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No shifts configured yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}