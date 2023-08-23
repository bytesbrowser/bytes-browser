import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { DirectoryContents } from '../lib/types';

export const FolderExplorer = () => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [directories, setDirectories] = useState<DirectoryContents[]>([]);

  useEffect(() => {
    if (runtime.currentDrive) {
      invoke('open_directory', { path: runtime.currentDrive.mount_point + runtime.currentPath }).then((res) => {
        setDirectories(res as DirectoryContents[]);
      });
    }
  }, [runtime.currentDrive]);

  useEffect(() => {
    if (runtime.currentPath === '' && runtime.currentDrive) {
      invoke('open_directory', { path: runtime.currentDrive.mount_point }).then((res) => {
        setDirectories(res as DirectoryContents[]);
      });
    } else if (runtime.currentDrive) {
      invoke('open_directory', { path: runtime.currentDrive.mount_point + runtime.currentPath }).then((res) => {
        setDirectories(res as DirectoryContents[]);
      });
    }
  }, [runtime.currentPath]);

  return (
    <div className="folder-explorer max-h-full overflow-hidden overflow-y-auto">
      <div className="top mb-8 border-b">
        <p>Folder Explorer</p>
      </div>
      <div className="explorer-contents">
        {directories.map((directory, key) => (
          <p
            onClick={() => {
              if (directory['Directory']) {
                setRuntime({
                  ...runtime,
                  currentPath: runtime.currentPath + directory['Directory']![0] + '/',
                });
              }
            }}
            key={key}
          >
            {directory['Directory'] ? directory['Directory'][0] : directory['File']![0]}
          </p>
        ))}
      </div>
    </div>
  );
};
