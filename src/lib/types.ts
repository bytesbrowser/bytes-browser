export interface Device {
  id: string;
  name: string;
  mount_point: string;
  size: number;
  used: number;
  available: number;
  removable: boolean;
}
