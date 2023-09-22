import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { Command, ProfileStore } from '../lib/types';

export const Commands = () => {
  const [runtime] = useRecoilState(runtimeState);

  const [commands, setCommands] = useState<Command[]>([]);

  useEffect(() => {
    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        const commands = (await db.commands) ?? [];
        setCommands(commands);
      } else {
        setCommands([]);
      }
    });
  }, []);

  return (
    <div className="folder-explorer h-[96.5vh] overflow-hidden animate__animated animate__fadeIn animate__faster p-8">
      <div className="border-b border-white border-opacity-10 pb-4 mb-4">
        <div>
          <h1 className="text-lg">Commands</h1>
          <p className="mt-2 leading-loose text-xs opacity-80">
            These are the command routines you have created. You can edit, delete, or run them from here.
          </p>
        </div>
      </div>
    </div>
  );
};
