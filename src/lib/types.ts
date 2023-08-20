export interface Device {
  name: string;
  mount_point: any;
  size: number;
  used: number;
  available: number;
  removable: boolean;
  file_system_type: string;
  disk_type: string;
}
