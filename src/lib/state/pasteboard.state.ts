import { atom } from 'recoil';

import { DirectoryContents } from '../types';

export const pasteboardState = atom<{
  currentOperation: 'CUT' | 'COPY' | 'NONE';
  file: DirectoryContents | null;
  mountPoint: string;
}>({
  key: 'pasteboard_state',
  default: {
    currentOperation: 'NONE',
    file: null,
    mountPoint: '',
  },
});
