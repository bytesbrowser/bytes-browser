import { atom } from 'recoil';

import { DirectoryContents } from '../types';

export const stateCacheState = atom<{
  folderSizes: { size: number }[];
}>({
  key: 'state_cache_state',
  default: {
    folderSizes: [],
  },
});
