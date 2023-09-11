export interface Device {
  name: string;
  mount_point: any;
  size: number;
  used: number;
  available: number;
  removable: boolean;
  file_system_type: string;
  disk_type: string;
  recycle_bin_path: string;
}

export interface TagDocPath {
  path: string;
  mount_point: string;
}

export interface TagDoc {
  uuid: string;
  file_paths: TagDocPath[];
  identifier: string;
  color_hex: string;
}

export interface BookmarkDoc {
  uuid: string;
  file_path: string;
  identifier: string;
  mount_point: string;
}

export interface HiddenFolderDoc {
  uuid: string;
  file_path: string;
  identifier: string;
  mount_point: string;
}

export interface ProfileStore {
  tags: TagDoc[];
  bookmarks: BookmarkDoc[];
  recentSearches: string[];
  themePreference: string;
  hiddenFolders: HiddenFolderDoc[];
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
  Directory?: [string, string, number, number, string, boolean];
  File?: [string, string, number, number, string];
}

export interface SearchResult {
  results: DirectoryContents[];
  more: boolean;
}

export interface GitMeta {
  can_commit: boolean;
  can_fetch: boolean;
  can_pull: boolean;
  can_init: boolean;
  can_push: boolean;
  can_stash: boolean;
  branches: string[];
  current_branch: string;
}

export interface TagPathResults {
  [key: string]: {
    data: DirectoryContents;
    error: string | null;
  };
}

export interface ThemeJSONSchema {
  sidebarBG?: string;
  primaryBG?: string;
  primaryTextColor?: string;
  iconColor?: string;
  lightTextOpacity?: number;
  sidebarInsetBg?: string;
  sidebarInsetTextColor?: string;
  iconLightOpacity?: number;
  sidebarBorderColor?: string;
  primaryBorderColor?: string;
  scrollbarThumbColor?: string;
  scrollbarThumbHoverColor?: string;
  scrollbarThumbActiveColor?: string;
  scrollbarTrackColor?: string;
}
