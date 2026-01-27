export type Permission = {
  id: string;
  name: string;
};

export type PermissionSubDomain = {
  id: string;
  name: string;
  permissions: Permission[];
};

export type PermissionsDomain = {
  id: string;
  name: string;
  subDomain: PermissionSubDomain[];
};
