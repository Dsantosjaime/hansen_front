export type Permission = {
  subject: string;
  action: string;
};

export type PermissionSubGroup = {
  name: string;
  permissions: Permission[];
};

export type PermissionGroup = {
  id: string;
  name: string;
  permissionSubGroup: PermissionSubGroup[];
};
