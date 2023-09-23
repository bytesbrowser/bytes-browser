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
  pinLock?: string;
  commands: Command[];
}

export const enum CommandType {
  Shell = 'Shell',
  Bash = 'Bash',
}

export type Command = {
  name: string;
  commands: string[];
  description: string;
  time: number;
  interval: string;
  mountPoint: string;
  path: string;
  command_type: CommandType;
};

export type CommandRunEvent = {
  command: string;
  error: boolean;
  stdout: string | null;
  stderr: string | null;
};

// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct CommandRunEvent {
//     command: String,
//     error: bool,
//     stdout: Option<String>,
//     stderr: Option<String>,
// }

export interface Profile {
  name: string;
  avatar?: string;
  email: string;
  token?: string;
  addedOn: string;
  lastUsed: string;
}

export interface DirectoryContents {
  Directory?: [string, string, number, number, string, boolean, boolean];
  File?: [string, string, number, number, string, boolean];
}

// #[derive(Serialize, Deserialize, Clone)]
// pub enum DirectoryChild {
//     File(String, String, u64, u64, String), // Name of file, path to file, size of file, last modified seconds, type of file
//     Directory(String, String, u64, u64, String, bool, bool), // Name of directory, path to directory, size of directory, last modified seconds, is git repo, isSupportedProject
// }

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

export enum ProjectType {
  NPM,
  Cargo,
}

export interface ProjectMetadata {
  project_type: ProjectType;
  name: string;
  version: string;
  description: string | null;
  dependencies: {
    [key: string]: string;
  };
  dev_dependencies: {
    [key: string]: string;
  };
}

// #[derive(Debug, Serialize)]
// pub enum ProjectType {
//     NPM,
//     Cargo,
// }

// #[derive(Debug, Serialize)]
// pub struct ProjectMetadata {
//     project_type: ProjectType,
//     name: String,
//     version: String,
//     description: Option<String>,
//     dependencies: HashMap<String, String>,
// dev_dependencies: HashMap<String, String>,
// }

export type NPMPackageResults = {
  results: NPMPackageResult[];
  total: number;
};

export type NPMPackageResult = {
  package: NPMPackageField;
  flags: {
    unstable: boolean;
  };
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
  searchScore: number;
};

type NPMPackageField = {
  name: string;
  scope: string;
  version: string;
  description: string;
  date: string;
  links: {
    [key: string]: string;
  };
  author: {
    name: string;
  };
  publisher: {
    username: string;
    email: string;
  };
  maintainers: { username: string; email: string }[];
};
