import { invoke } from '@tauri-apps/api/tauri';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ReactJson from 'react-json-view';
import ReactModal from 'react-modal';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { Command, CommandType, ProfileStore } from '../lib/types';

export const Commands = () => {
  const [runtime] = useRecoilState(runtimeState);
  const [logModalOpen, setLogModalOpen] = useState<boolean>(false);
  const [logModalCommand, setLogModalCommand] = useState<Command | null>(null);

  const [commands, setCommands] = useState<Command[]>([]);

  useEffect(() => {
    console.log(runtime.commandLogs);

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
          <p className="mt-4 leading-loose text-xs opacity-80">
            These are the command routines you have created. You can edit, delete, or run them from here.
          </p>
        </div>
      </div>
      <div className="results grid grid-cols-4 gap-0">
        {commands.map((command, key) => (
          <div
            className="p-4 rounded-md shadow-lg w-[300px] cursor-pointer border border-white border-opacity-10"
            key={key}
            style={{
              backgroundColor: 'var(--sidebar-inset-bg)',
            }}
          >
            <p className="text-lg font-mono">{command.name}</p>
            <p className="text-xs text-yellow-500 mt-4 opacity-80">
              Every {command.time} {command.interval} in{' '}
              <span className="text-yellow-500">
                {(command.mountPoint + command.path).length > 25
                  ? (command.mountPoint + command.path).slice(0, 25) + '...'
                  : command.mountPoint + command.path}
              </span>
            </p>
            <p className="text-xs mt-4 opacity-80">
              {command.commands.length < 5 ? (
                <span className="text-green-500">Low Complexity</span>
              ) : command.commands.length > 10 ? (
                <span className="text-yellow-500">High Complexity</span>
              ) : (
                <span className="text-red-500">Medium Complexity</span>
              )}
            </p>
            <p className="text-xs leading-loose mt-4">{command.description}</p>
            <div className="actions mt-4 flex items-center justify-between">
              {/* <button
                disabled
                className="rounded-md px-4 py-2 hover:opacity-80 transition-all text-sm w-2/4"
                style={{
                  backgroundColor: 'var(--primary-bg)',
                }}
              >
                Edit
              </button> */}
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
                className="rounded-md px-4 py-2 hover:opacity-80 transition-all bg-error text-sm w-full"
              >
                Delete
              </button>
            </div>
            <button
              onClick={() => {
                console.log(runtime.commandLogs);
                invoke('run_command_once', {
                  command: {
                    ...command,
                    mount_point: command.mountPoint,
                    command_type: command.command_type.toString(),
                  },
                  commandType: command.command_type.toString(),
                })
                  .then((res) => {
                    console.log(res);
                  })
                  .catch((err) => {
                    console.error(err);
                  });
              }}
              className="flex items-center justify-center rounded-md px-4 py-2 hover:opacity-80 transition-all text-sm mt-4 w-full bg-green-600"
            >
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
            <button
              onClick={() => {
                setLogModalCommand(command);
                setLogModalOpen(true);
              }}
              className="flex items-center justify-center rounded-md px-4 py-2 hover:opacity-80 transition-all text-sm mt-4 w-full bg-green-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="mr-2" viewBox="0 0 48 48">
                <g fill="none" stroke="white" stroke-linejoin="round" stroke-width="4">
                  <path d="M13 10h28v34H13z" />
                  <path stroke-linecap="round" d="M35 10V4H8a1 1 0 0 0-1 1v33h6m8-16h12m-12 8h12" />
                </g>
              </svg>
              <p> Logs</p>
            </button>
          </div>
        ))}
      </div>
      <ReactModal
        isOpen={logModalOpen}
        onRequestClose={() => {
          setLogModalOpen(false);
        }}
        style={{
          content: {
            background: 'radial-gradient(circle, rgba(28,27,32,0.9) 0%, rgba(25,25,24,1) 100%)',
            border: 'none',
            padding: 0,
            width: '80%',
            height: 'min-content',
            margin: 'auto',
            borderRadius: '12px',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <div className="p-4">
          <p className="text-lg">
            Command Logs for <span className="font-mono text-yellow-500">{logModalCommand?.name}</span>
          </p>
          <hr className="my-4 opacity-50" />
          <ReactJson
            displayDataTypes={false}
            collapsed={false}
            collapseStringsAfterLength={false}
            enableClipboard={false}
            displayObjectSize={false}
            style={{
              height: '500px',
              overflow: 'auto',
              padding: '10px',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
            }}
            theme="monokai"
            src={runtime.commandLogs
              .filter((log) => log.command === logModalCommand?.name)
              .map((log) => ({
                ...log,
                stdout: log.stdout ? log.stdout : '',
                stderr: log.stderr ? log.stderr : '',
              }))}
          />
        </div>
      </ReactModal>
    </div>
  );
};
