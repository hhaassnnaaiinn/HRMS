import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Building, Plus, Users, Edit, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Department {
  id: string;
  name: string;
  description: string;
  created_at: string;
  employee_count: number;
}

export default function ManageDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      setLoading(true);
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('id, name, description, created_at')
        .order('name');

      if (!departmentsData) return;

      const departmentsWithCount = await Promise.all(
        departmentsData.map(async (dept) => {
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)
            .eq('is_active', true);

          return {
            ...dept,
            employee_count: count || 0
          };
        })
      );

      setDepartments(departmentsWithCount);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update({
            name: formData.name,
            description: formData.description,
          })
          .eq('id', editingDepartment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([{
            name: formData.name,
            description: formData.description,
          }]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingDepartment(null);
      setFormData({ name: '', description: '' });
      fetchDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
    }
  }

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description,
    });
    setShowForm(true);
  };

  const handleDelete = (department: Department) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Department',
      message: `Are you sure you want to delete ${department.name}? ${
        department.employee_count > 0 
          ? `This will unassign ${department.employee_count} employee${department.employee_count > 1 ? 's' : ''} from this department.`
          : ''
      }`,
      onConfirm: async () => {
        try {
          if (department.employee_count > 0) {
            const { error: updateError } = await supabase
              .from('employees')
              .update({ department_id: null })
              .eq('department_id', department.id);

            if (updateError) throw updateError;
          }

          const { error: deleteError } = await supabase
            .from('departments')
            .delete()
            .eq('id', department.id);

          if (deleteError) throw deleteError;

          fetchDepartments();
        } catch (error) {
          console.error('Error deleting department:', error);
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
        <h1 className="text-2xl font-semibold text-gray-900">Manage Departments</h1>
        <Button onClick={() => {
          setEditingDepartment(null);
          setFormData({ name: '', description: '' });
          setShowForm(!showForm);
        }}>
          <Plus className="h-5 w-5 mr-2" />
          Add Department
        </Button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">
            {editingDepartment ? 'Edit Department' : 'Add New Department'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department Name
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

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingDepartment(null);
                  setFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingDepartment ? 'Update Department' : 'Create Department'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((department, index) => (
          <div
            key={department.id}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">
                      {index + 1}.
                    </span>
                    <Building className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-lg font-medium text-gray-900">
                        {department.name}
                      </dt>
                      <dd className="mt-2 text-sm text-gray-600">
                        {department.description || 'No description provided'}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(department)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(department)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-500">
                  {department.employee_count} {department.employee_count === 1 ? 'Employee' : 'Employees'}
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