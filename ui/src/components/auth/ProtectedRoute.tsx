import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'free' | 'subscribed' | 'admin';
}

export function ProtectedRoute({ children, requiredRole = 'free' }: ProtectedRouteProps) {
  const { isAuthenticated, hasAccess } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!hasAccess(requiredRole)) {
    return <Navigate to="/upgrade" replace />;
  }
  
  return <>{children}</>;
}