import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole =
  | 'fleet_manager'
  | 'operations_manager'
  | 'driver'
  | 'maintenance_staff'
  | 'finance';

interface UserRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('userRole');
    return (saved as UserRole) || 'fleet_manager';
  });

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('userRole', newRole);
  };

  return (
    <UserRoleContext.Provider value={{ role, setRole: handleSetRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within UserRoleProvider');
  }
  return context;
}

export const rolePermissions: Record<UserRole, string[]> = {
  fleet_manager: [
    '/',
    '/fleet',
    '/trips',
    '/drivers',
    '/vehicles',
    '/maintenance',
    '/reports',
    '/finance',
    '/settings',
    '/profile',
    '/user-access',
  ],
  operations_manager: [
    '/',
    '/fleet',
    '/trips',
    '/drivers',
    '/vehicles',
    '/maintenance',
    '/reports',
    '/profile',
  ],
  driver: ['/', '/trips', '/vehicles', '/profile', '/settings'],
  maintenance_staff: ['/', '/maintenance', '/vehicles', '/reports', '/profile'],
  finance: ['/', '/finance', '/reports', '/settings', '/profile'],
};
