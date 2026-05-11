export type Permission = {
  subject: string;
  action: string;
};

export type User = {
  id: string;
  keycloakId?: string;
  email: string;
  name: string;
  roleId?: string | null;
  phoneFixed: string | null;
  phoneMobile: string | null;
  jobTitle: string | null;

  role?: {
    id: string;
    name: string;
    permissions: Permission[];
  } | null;
};
