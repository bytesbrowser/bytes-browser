import { atom } from 'recoil';

import { DirectoryContents } from '../types';

export const currentContextState = atom<{
  currentItem: DirectoryContents | null;
}>({
  key: 'current_context_state',
  default: {
    currentItem: null,
  },
});
