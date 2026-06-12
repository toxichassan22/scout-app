import { memo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = memo(function ProtectedRoute({ children }) {
  return children;
});
