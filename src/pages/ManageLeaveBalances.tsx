import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Edit, Save, X } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  departments: {
    name: string;
  };
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  total_days: number;
  used_days: number;
  year: number;
}

interface LeaveType {
  id: string;
  name: string;
  is_paid: boolean;
}

interface EditingBalance {
  balanceId: string;
  value: number;
}

export default function ManageLeaveBalances() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBalance, setEditingBalance] = useState<EditingBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      const [employeesResponse, leaveTypesResponse, balancesResponse] = await Promise.all([
        supabase
          .from('employees')
          .select(`
            id,
            first_name,
            last_name,
            email,
            departments (
              name
            )
          `)
          .eq('is_active', true)
          .order('first_name'),
        
        supabase
          .from('leave_types')
          .select('id, name, is_paid')
          .order('name'),
        
        supabase
          .from('leave_balances')
          .select('*')
          .eq('year', currentYear)
      ]);

      if (employeesResponse.error) throw employeesResponse.error;
      if (leaveTypesResponse.error) throw leaveTypesResponse.error;
      if (balancesResponse.error) throw balancesResponse.error;

      setEmployees(employeesResponse.data || []);
      setLeaveTypes(leaveTypesResponse.data || []);
      setLeaveBalances(balancesResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (balanceId: string, totalDays: number) => {
    setEditingBalance({ balanceId, value: totalDays });
  };

  const handleSave = async () => {
    if (!editingBalance) return;

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('leave_balances')
        .update({ total_days: editingBalance.value })
        .eq('id', editingBalance.balanceId);

      if (updateError) throw updateError;
      
      setEditingBalance(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating balance:', error);
      setError(error.message || 'Failed to update leave balance');
    }
  };

  const getBalance = (employeeId: string, leaveTypeId: string) => {
    return leaveBalances.find(b => 
      b.employee_id === employeeId && 
      b.leave_type_id === leaveTypeId
    ) || {
      id: '',
      total_days: 0,
      used_days: 0
    };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Manage Leave Balances</h1>
        <div className="text-sm text-gray-500">
          Year: {currentYear}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              {leaveTypes.map(type => (
                <th key={type.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {type.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {employee.departments?.name || '-'}
                </td>
                {leaveTypes.map(type => {
                  const balance = getBalance(employee.id, type.id);
                  return (
                    <td key={type.id} className="px-6 py-4 whitespace-nowrap">
                      {editingBalance?.balanceId === balance.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={editingBalance.value}
                            onChange={(e) => setEditingBalance({
                              ...editingBalance,
                              value: parseInt(e.target.value)
                            })}
                          />
                          <Button
                            size="sm"
                            onClick={handleSave}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBalance(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {balance.total_days - balance.used_days} / {balance.total_days}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(balance.id, balance.total_days)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}