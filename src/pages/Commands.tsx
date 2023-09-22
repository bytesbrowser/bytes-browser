import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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
      <div className="results grid grid-cols-3 gap-0">
        {commands.map((command, key) => (
          <div
            className="p-4 rounded-md shadow-lg w-[300px] cursor-pointer border border-white border-opacity-10"
            key={key}
            style={{
              backgroundColor: 'var(--sidebar-inset-bg)',
            }}
          >
            <p className="text-lg font-mono">{command.name}</p>
            <p className="text-xs text-yellow-500 mt-2 opacity-80">
              Every {command.time} {command.interval}
            </p>
            <p className="text-xs mt-2 opacity-80">
              {command.commands.length < 5 ? (
                <span className="text-green-500">Low Complexity</span>
              ) : command.commands.length > 10 ? (
                <span className="text-yellow-500">High Complexity</span>
              ) : (
                <span className="text-red-500">Medium Complexity</span>
              )}
            </p>
            <p className="text-xs leading-loose mt-2">{command.description}</p>
            <div className="actions mt-4 flex items-center justify-between">
              <button
                className="rounded-md px-4 py-2 hover:opacity-80 transition-all text-sm w-2/4"
                style={{
                  backgroundColor: 'var(--primary-bg)',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
                    if (db) {
                      const commands = db.commands ?? [];
                      const newCommands = commands.filter((c) => c.name !== command.name);

                      await runtime.store.set(`profile-store-${runtime.currentUser}`, {
                        ...db,
                        commands: newCommands,
                      });

                      await runtime.store.save();

                      setCommands(newCommands);
                      toast.success('Routine has been deleted');
                    } else {
                      setCommands([]);
                      toast.success('Routine has been deleted');
                    }
                  });
                }}
                className="ml-2 rounded-md px-4 py-2 hover:opacity-80 transition-all bg-error text-sm w-2/4"
              >
                Delete
              </button>
            </div>
            <button className="flex items-center justify-center rounded-md px-4 py-2 hover:opacity-80 transition-all text-sm mt-4 w-full bg-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="mr-2">
                <g fill="white">
                  <path d="M2.78 2L2 2.41v12l.78.42l9-6V8l-9-6zM3 13.48V3.35l7.6 5.07L3 13.48z" />
                  <path
                    fill-rule="evenodd"
                    d="m6 14.683l8.78-5.853V8L6 2.147V3.35l7.6 5.07L6 13.48v1.203z"
                    clip-rule="evenodd"
                  />
                </g>
              </svg>
              <p>Run</p>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
