import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface LeaveType {
  id: string;
  name: string;
  description: string;
  is_paid: boolean;
  default_days: number;
}

export default function ManageLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_paid: true,
    default_days: 0
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  async function fetchLeaveTypes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setLeaveTypes(data || []);
    } catch (error) {
      console.error('Error fetching leave types:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingType) {
        const { error } = await supabase
          .from('leave_types')
          .update({
            name: formData.name,
            description: formData.description,
            is_paid: formData.is_paid,
            default_days: formData.default_days
          })
          .eq('id', editingType.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leave_types')
          .insert([{
            name: formData.name,
            description: formData.description,
            is_paid: formData.is_paid,
            default_days: formData.default_days
          }]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingType(null);
      setFormData({ name: '', description: '', is_paid: true, default_days: 0 });
      fetchLeaveTypes();
    } catch (error) {
      console.error('Error saving leave type:', error);
    }
  }

  const handleEdit = (leaveType: LeaveType) => {
    setEditingType(leaveType);
    setFormData({
      name: leaveType.name,
      description: leaveType.description,
      is_paid: leaveType.is_paid,
      default_days: leaveType.default_days
    });
    setShowForm(true);
  };

  const handleDelete = (leaveType: LeaveType) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Leave Type',
      message: `Are you sure you want to delete ${leaveType.name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('leave_types')
            .delete()
            .eq('id', leaveType.id);

          if (error) throw error;
          fetchLeaveTypes();
        } catch (error) {
          console.error('Error deleting leave type:', error);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Manage Leave Types</h1>
        <Button onClick={() => {
          setEditingType(null);
          setFormData({ name: '', description: '', is_paid: true, default_days: 0 });
          setShowForm(!showForm);
        }}>
          <Plus className="h-5 w-5 mr-2" />
          Add Leave Type
        </Button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">
            {editingType ? 'Edit Leave Type' : 'Add New Leave Type'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Days
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={formData.default_days}
                  onChange={(e) => setFormData({ ...formData, default_days: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_paid"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.is_paid}
                  onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                />
                <label htmlFor="is_paid" className="ml-2 text-sm text-gray-700">
                  Paid Leave
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingType(null);
                  setFormData({ name: '', description: '', is_paid: true, default_days: 0 });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingType ? 'Update Leave Type' : 'Create Leave Type'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {leaveTypes.map((leaveType) => (
          <div
            key={leaveType.id}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {leaveType.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {leaveType.description || 'No description provided'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(leaveType)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(leaveType)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Default: {leaveType.default_days} days
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  leaveType.is_paid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {leaveType.is_paid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}