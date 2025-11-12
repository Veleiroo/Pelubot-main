export type StylistPublic = {
  id: string;
  name: string;
  services: string[];
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  calendar_id?: string | null;
  use_gcal_busy?: boolean;
};
