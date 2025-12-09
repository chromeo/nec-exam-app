import React from 'react';
import { AdminDashboard } from './admin/AdminDashboard';

interface AdminAreaProps {
  accessToken: string;
  onBack: () => void;
}

export const AdminArea: React.FC<AdminAreaProps> = ({ accessToken, onBack }) => {
  return (
    <AdminDashboard 
      accessToken={accessToken}
      onExitAdmin={onBack}
    />
  );
};