import { atom } from 'recoil';
import { Store } from 'tauri-plugin-store-api';

import { Device } from '../types';

export const runtimeState = atom<{
  currentDrive: Device | null;
  readVolumes: boolean;
  readTags: boolean;
  readBookmarks: boolean;
  store: Store;
  profileStore: Store;
  currentUser: number;
}>({
  key: 'runtime_state',
  default: {
    currentDrive: null,
    readVolumes: true,
    readTags: false,
    readBookmarks: false,
    store: new Store('.settings.dat'),
    profileStore: new Store('.profiles.dat'),
    currentUser: 0,
  },
});
