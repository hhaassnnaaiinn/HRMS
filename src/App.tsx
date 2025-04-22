import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useAdminStore } from './stores/adminStore';
import { ROUTES } from './lib/constants/routes';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyAttendance from './pages/MyAttendance';
import MyLeaves from './pages/MyLeaves';
import LeaveBalances from './pages/LeaveBalances';
import RequestLeave from './pages/RequestLeave';
import EditProfile from './pages/EditProfile';
import AdminDashboard from './pages/AdminDashboard';
import ManageEmployees from './pages/ManageEmployees';
import ManageAttendance from './pages/ManageAttendance';
import ManageLeaves from './pages/ManageLeaves';
import ManageLeaveBalances from './pages/ManageLeaveBalances';
import ManageDepartments from './pages/ManageDepartments';
import ManageLeaveTypes from './pages/ManageLeaveTypes';
import SystemSettings from './pages/SystemSettings';
import EmployeeTracking from './pages/EmployeeTracking';
import EmployeeActivityDetails from './pages/EmployeeActivityDetails';
import { LoadingSpinner } from './components/ui/loading-spinner';

function App() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();
  const { isAdmin, checkAdminStatus } = useAdminStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      checkAdminStatus();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path={ROUTES.LOGIN} element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } />
        
        {isAuthenticated ? (
          <Route element={<Layout />}>
            <Route path={ROUTES.DASHBOARD} element={isAdmin ? <AdminDashboard /> : <Dashboard />} />
            <Route path={ROUTES.EDIT_PROFILE} element={<EditProfile />} />
            {isAdmin ? (
              <>
                <Route path={ROUTES.MANAGE_EMPLOYEES} element={<ManageEmployees />} />
                <Route path={ROUTES.MANAGE_DEPARTMENTS} element={<ManageDepartments />} />
                <Route path={ROUTES.MANAGE_ATTENDANCE} element={<ManageAttendance />} />
                <Route path={ROUTES.MANAGE_LEAVES} element={<ManageLeaves />} />
                <Route path={ROUTES.MANAGE_LEAVE_BALANCES} element={<ManageLeaveBalances />} />
                <Route path={ROUTES.MANAGE_LEAVE_TYPES} element={<ManageLeaveTypes />} />
                <Route path={ROUTES.EMPLOYEE_TRACKING} element={<EmployeeTracking />} />
                <Route path="/employee-tracking/:employeeId/:deviceId" element={<EmployeeActivityDetails />} />
                <Route path={ROUTES.SYSTEM_SETTINGS} element={<SystemSettings />} />
              </>
            ) : (
              <>
                <Route path={ROUTES.MY_ATTENDANCE} element={<MyAttendance />} />
                <Route path={ROUTES.MY_LEAVES} element={<MyLeaves />} />
                <Route path={ROUTES.LEAVE_BALANCES} element={<LeaveBalances />} />
                <Route path={ROUTES.REQUEST_LEAVE} element={<RequestLeave />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        )}
      </Routes>
    </Router>
  );
}

export default App