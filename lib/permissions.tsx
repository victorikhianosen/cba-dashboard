"use client";

import { createContext, useContext, type ReactNode } from "react";

type CurrentUser = Record<string, any> | null;

interface PermissionsContextValue {
  currentUser: CurrentUser;
  roles: string[];
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

// Fails closed: if a component somehow renders outside the provider, treat
// it as having no permissions rather than silently granting everything.
const PermissionsContext = createContext<PermissionsContextValue>({
  currentUser: null,
  roles: [],
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
});

interface PermissionsProviderProps {
  currentUser: CurrentUser;
  children: ReactNode;
}

export function PermissionsProvider({
  currentUser,
  children,
}: PermissionsProviderProps) {
  const roles: string[] = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
  const permissions: string[] = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : [];

  function hasPermission(permission: string) {
    return permissions.includes(permission);
  }

  function hasAnyPermission(required: string[]) {
    if (required.length === 0) return true;
    return required.some((permission) => permissions.includes(permission));
  }

  return (
    <PermissionsContext.Provider
      value={{ currentUser, roles, permissions, hasPermission, hasAnyPermission }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
