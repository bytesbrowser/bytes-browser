import { atom } from 'recoil';

export const pasteboardState = atom<{
  currentOperation: 'CUT' | 'COPY' | 'NONE';
  filePath: string;
}>({
  key: 'pasteboard_state',
  default: {
    currentOperation: 'NONE',
    filePath: '',
  },
});
