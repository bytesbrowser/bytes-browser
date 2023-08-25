import { isRegistered, register, unregister } from '@tauri-apps/api/globalShortcut';
import { useEffect } from 'react';

export const useHotkey = (command: string, callback: (shortcut: string) => void) => {
  useEffect(() => {
    isRegistered(command).then((registered) => {
      if (registered) {
        unregister(command);
        register(command, callback);
      } else {
        register(command, callback);
      }
    });
  }, [command, callback]);
};
