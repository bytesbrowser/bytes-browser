import { atom } from 'recoil';
import { Store } from 'tauri-plugin-store-api';

import { CommandRunEvent, Device } from '../types';

export const runtimeState = atom<{
  currentDrive: Device | null;
  readVolumes: boolean;
  readTags: boolean;
  readBookmarks: boolean;
  store: Store;
  profileStore: Store;
  currentUser: number;
  showFeedbackWindow: boolean;
  currentPath: string;
  devices: Device[];
  listStyle: 'GRID' | 'LIST' | 'TREE';
  searchOpen: boolean;
  commandBuilderOpen: boolean;
  currentDriveName?: string;
  isInRecycleBin: boolean;
  showHiddenFiles: boolean;
  commandLogs: CommandRunEvent[];
}>({
  key: 'runtime_state',
  default: {
    currentDrive: null,
    readVolumes: false,
    commandBuilderOpen: false,
    readTags: false,
    readBookmarks: false,
    store: new Store('.settings.dat'),
    profileStore: new Store('.profiles.dat'),
    currentUser: 0,
    showFeedbackWindow: false,
    currentPath: '',
    devices: [],
    listStyle: 'LIST',
    searchOpen: false,
    currentDriveName: undefined,
    isInRecycleBin: false,
    showHiddenFiles: false,
    commandLogs: [],
  },
});
