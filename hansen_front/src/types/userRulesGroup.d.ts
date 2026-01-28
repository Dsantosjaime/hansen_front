import { Permission } from "./permissionGroup";

export type UserRulesGroup = {
  id: string;
  name: string;
  permissions: Permission[];
};
