import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { DirectoryContents } from '../lib/types';

export const FolderExplorer = () => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [directories, setDirectories] = useState<DirectoryContents[]>([]);
  const [navigationRules, setNavigationRules] = useState<{ forward: string[]; back: string[] }>({
    forward: [],
    back: [],
  });
  const currentIndex = location.pathname.split('/')[2];

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

  useEffect(() => {
    console.log(navigationRules);
  }, [navigationRules]);

  return (
    <div className="folder-explorer max-h-full overflow-hidden overflow-y-auto animate__animated animate__fadeIn animate__faster">
      <div className="top border-b border-white border-opacity-10 flex items-center border-t">
        <div className="arrows flex items-center justify-around border-r border-white border-opacity-10 mr-4 pr-2 py-2 pl-2">
          <svg
            width="24"
            onClick={() => {
              if (navigationRules.back.length > 0) {
                const previousPath = navigationRules.back.pop();

                setNavigationRules((prevRules) => ({
                  forward: [runtime.currentPath, ...prevRules.forward],
                  back: navigationRules.back,
                }));

                setRuntime({
                  ...runtime,
                  currentPath: previousPath ?? '',
                });
              }
            }}
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`${runtime.currentPath === '' && 'opacity-50'} mx-1 cursor-pointer`}
          >
            <path
              d="M5 12H19M5 12L11 6M5 12L11 18"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <svg
            onClick={() => {
              if (navigationRules.forward.length > 0) {
                const nextPath = navigationRules.forward.pop();

                setNavigationRules((prevRules) => ({
                  back: [...prevRules.back, runtime.currentPath],
                  forward: navigationRules.forward,
                }));

                setRuntime({
                  ...runtime,
                  currentPath: nextPath ?? '',
                });
              }
            }}
            className={`${navigationRules.forward.length === 0 && 'opacity-50'} mx-1 cursor-pointer`}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5M19 12L13 18M19 12L13 6"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div className="breadcrumbs flex items-center py-2">
          <svg
            width="21"
            height="21"
            viewBox="0 0 21 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2"
          >
            <g clip-path="url(#clip0_8_68)">
              <path
                d="M2.1 1.4C1.54305 1.4 1.0089 1.62125 0.615076 2.01508C0.221249 2.4089 0 2.94305 0 3.5L0 17.5C0 18.057 0.221249 18.5911 0.615076 18.9849C1.0089 19.3788 1.54305 19.6 2.1 19.6H18.9C19.457 19.6 19.9911 19.3788 20.3849 18.9849C20.7788 18.5911 21 18.057 21 17.5V6.3C21 5.74305 20.7788 5.2089 20.3849 4.81508C19.9911 4.42125 19.457 4.2 18.9 4.2H10.7898L7.9898 1.4H2.1Z"
                fill="white"
              />
            </g>
            <defs>
              <clipPath id="clip0_8_68">
                <rect width="21" height="21" fill="white" />
              </clipPath>
            </defs>
          </svg>

          <div className="crumbs flex items-center">
            <Link
              to={`/drive/${currentIndex}`}
              className="underline cursor-pointer font-light"
              onClick={() => {
                setRuntime({
                  ...runtime,
                  currentPath: '',
                });
                setNavigationRules({
                  forward: [],
                  back: [],
                });
              }}
            >
              {runtime.currentDrive?.name}://
            </Link>
            {runtime.currentPath
              .split('/')
              .filter((path) => path.length > 1)
              .map((path, key) => (
                <p
                  onClick={() => {
                    let paths = runtime.currentPath.split('/');

                    const clickedPath = paths.indexOf(path);

                    if (clickedPath === -1) return;

                    const newPaths = paths.slice(0, clickedPath + 1);

                    const newPath = newPaths.join('/') + '/';

                    setNavigationRules((prevRules) => ({
                      forward: [...prevRules.forward, runtime.currentPath],
                      back: navigationRules.back,
                    }));

                    setRuntime({
                      ...runtime,
                      currentPath: newPath,
                    });
                  }}
                  className="underline cursor-pointer font-light"
                  key={key}
                >
                  {path}/
                </p>
              ))}
          </div>
        </div>
      </div>
      <div className="explorer-contents">
        {directories.map((directory, key) => (
          <p
            onClick={() => {
              if (directory['Directory']) {
                setNavigationRules((prevRules) => ({
                  forward: [],
                  back: [...prevRules.back, runtime.currentPath],
                }));

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
