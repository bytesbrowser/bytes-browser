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

export interface TagDoc {
  uuid: string;
  file_paths: string[];
  identifier: string;
  color_hex: string;
}

export interface BookmarkDoc {
  uuid: string;
  file_path: string;
  identifier: string;
}

export interface ProfileStore {
  tags: TagDoc[];
  bookmarks: BookmarkDoc[];
}

export interface Profile {
  name: string;
  avatar?: string;
  email: string;
  token?: string;
  addedOn: string;
  lastUsed: string;
}

export interface DirectoryContents {
  Directory?: string[];
  File?: string[];
}
