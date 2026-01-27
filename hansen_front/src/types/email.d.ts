export type Email = {
  id: string;
  subject: string;
  template: {
    id: string;
    name: string;
  };
  groups: {
    id: string;
    name: string;
    subGroups: {
      id: string;
      name: string;
    }[];
  }[];
  sendingDate: string;
  status: string;
  sender: {
    id: string;
    name: string;
  };
};

export type EmailGrid = Omit<Email, "groups">;
