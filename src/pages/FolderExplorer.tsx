import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Moment from 'react-moment';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useRecoilState } from 'recoil';

import { SmartFileIcon } from '../components/SmartFileIcon';
import { runtimeState } from '../lib/state/runtime.state';
import { DirectoryContents } from '../lib/types';
import { formatBytes } from '../lib/utils/formatBytes';
import { secondsAgoToDate } from '../lib/utils/secondsToTimestamp';

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
      invoke('open_directory', { path: runtime.currentDrive.mount_point + runtime.currentPath }).then((res: any) => {
        setDirectories(res.data as DirectoryContents[]);
      });
    }
  }, [runtime.currentDrive]);

  useEffect(() => {
    if (runtime.currentPath === '' && runtime.currentDrive) {
      invoke('open_directory', { path: runtime.currentDrive.mount_point }).then((res: any) => {
        setDirectories(res.data as DirectoryContents[]);
      });
    } else if (runtime.currentDrive) {
      invoke('open_directory', { path: runtime.currentDrive.mount_point + runtime.currentPath }).then((res: any) => {
        setDirectories(res.data as DirectoryContents[]);
      });
    }
  }, [runtime.currentPath]);

  return (
    <div className="folder-explorer h-[96.5vh] overflow-hidden animate__animated animate__fadeIn animate__faster">
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
        <div className="breadcrumbs flex items-center py-2 justify-between flex-1 border-r border-white border-opacity-10 mr-4 overflow-hidden">
          <div className="crumbs flex items-center">
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

            <div className="flex items-center">
              <Link
                to={`/drive/${currentIndex}`}
                className="underline cursor-pointer font-light w-min whitespace-nowrap"
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
                .map((path, key, arr) => (
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
                    className={`underline w-min whitespace-nowrap cursor-pointer font-light ${
                      key === arr.length - 1 && runtime.currentPath.length > 76 && 'truncate'
                    }`}
                    key={key}
                  >
                    {path}/
                  </p>
                ))}
            </div>
          </div>
        </div>
        <div className="page-options flex items-center min-w-[150px]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="opacity-50 hover:opacity-100 cursor-pointer mr-3 transition-all"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M18 14C17.4696 14 16.9609 13.7893 16.5858 13.4142C16.2107 13.0391 16 12.5304 16 12C16 11.4696 16.2107 10.9609 16.5858 10.5858C16.9609 10.2107 17.4696 10 18 10C18.5304 10 19.0391 10.2107 19.4142 10.5858C19.7893 10.9609 20 11.4696 20 12C20 12.5304 19.7893 13.0391 19.4142 13.4142C19.0391 13.7893 18.5304 14 18 14ZM6 14C5.46957 14 4.96086 13.7893 4.58579 13.4142C4.21071 13.0391 4 12.5304 4 12C4 11.4696 4.21071 10.9609 4.58579 10.5858C4.96086 10.2107 5.46957 10 6 10C6.53043 10 7.03914 10.2107 7.41421 10.5858C7.78929 10.9609 8 11.4696 8 12C8 12.5304 7.78929 13.0391 7.41421 13.4142C7.03914 13.7893 6.53043 14 6 14ZM12 14C11.4696 14 10.9609 13.7893 10.5858 13.4142C10.2107 13.0391 10 12.5304 10 12C10 11.4696 10.2107 10.9609 10.5858 10.5858C10.9609 10.2107 11.4696 10 12 10C12.5304 10 13.0391 10.2107 13.4142 10.5858C13.7893 10.9609 14 11.4696 14 12C14 12.5304 13.7893 13.0391 13.4142 13.4142C13.0391 13.7893 12.5304 14 12 14Z"
              fill="white"
            />
          </svg>
          <div className="result-layout-options bg-sidebar flex items-center rounded-md mr-4">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`${
                runtime.listStyle === 'GRID' ? 'opacity-100 bg-[#36343E]' : 'opacity-50'
              } cursor-pointer hover:opacity-50 p-1 min-w-[35px] min-h-[25px] transition-all`}
            >
              <path
                d="M1 2.5C1 2.10218 1.15804 1.72064 1.43934 1.43934C1.72064 1.15804 2.10218 1 2.5 1H5.5C5.89782 1 6.27936 1.15804 6.56066 1.43934C6.84196 1.72064 7 2.10218 7 2.5V5.5C7 5.89782 6.84196 6.27936 6.56066 6.56066C6.27936 6.84196 5.89782 7 5.5 7H2.5C2.10218 7 1.72064 6.84196 1.43934 6.56066C1.15804 6.27936 1 5.89782 1 5.5V2.5ZM9 2.5C9 2.10218 9.15804 1.72064 9.43934 1.43934C9.72064 1.15804 10.1022 1 10.5 1H13.5C13.8978 1 14.2794 1.15804 14.5607 1.43934C14.842 1.72064 15 2.10218 15 2.5V5.5C15 5.89782 14.842 6.27936 14.5607 6.56066C14.2794 6.84196 13.8978 7 13.5 7H10.5C10.1022 7 9.72064 6.84196 9.43934 6.56066C9.15804 6.27936 9 5.89782 9 5.5V2.5ZM1 10.5C1 10.1022 1.15804 9.72064 1.43934 9.43934C1.72064 9.15804 2.10218 9 2.5 9H5.5C5.89782 9 6.27936 9.15804 6.56066 9.43934C6.84196 9.72064 7 10.1022 7 10.5V13.5C7 13.8978 6.84196 14.2794 6.56066 14.5607C6.27936 14.842 5.89782 15 5.5 15H2.5C2.10218 15 1.72064 14.842 1.43934 14.5607C1.15804 14.2794 1 13.8978 1 13.5V10.5ZM9 10.5C9 10.1022 9.15804 9.72064 9.43934 9.43934C9.72064 9.15804 10.1022 9 10.5 9H13.5C13.8978 9 14.2794 9.15804 14.5607 9.43934C14.842 9.72064 15 10.1022 15 10.5V13.5C15 13.8978 14.842 14.2794 14.5607 14.5607C14.2794 14.842 13.8978 15 13.5 15H10.5C10.1022 15 9.72064 14.842 9.43934 14.5607C9.15804 14.2794 9 13.8978 9 13.5V10.5Z"
                fill="white"
              />
            </svg>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`${
                runtime.listStyle === 'LIST' ? 'opacity-100 bg-[#36343E]' : 'opacity-50'
              } cursor-pointer hover:opacity-50 p-1 min-w-[35px] min-h-[25px] transition-all`}
            >
              <path
                d="M7 9V7H21V9H7ZM7 13V11H21V13H7ZM7 17V15H21V17H7ZM4 9C3.71667 9 3.479 8.904 3.287 8.712C3.095 8.52 2.99934 8.28267 3 8C3 7.71667 3.096 7.479 3.288 7.287C3.48 7.095 3.71734 6.99933 4 7C4.28334 7 4.521 7.096 4.713 7.288C4.905 7.48 5.00067 7.71733 5 8C5 8.28333 4.904 8.521 4.712 8.713C4.52 8.905 4.28267 9.00067 4 9ZM4 13C3.71667 13 3.479 12.904 3.287 12.712C3.095 12.52 2.99934 12.2827 3 12C3 11.7167 3.096 11.479 3.288 11.287C3.48 11.095 3.71734 10.9993 4 11C4.28334 11 4.521 11.096 4.713 11.288C4.905 11.48 5.00067 11.7173 5 12C5 12.2833 4.904 12.521 4.712 12.713C4.52 12.905 4.28267 13.0007 4 13ZM4 17C3.71667 17 3.479 16.904 3.287 16.712C3.095 16.52 2.99934 16.2827 3 16C3 15.7167 3.096 15.479 3.288 15.287C3.48 15.095 3.71734 14.9993 4 15C4.28334 15 4.521 15.096 4.713 15.288C4.905 15.48 5.00067 15.7173 5 16C5 16.2833 4.904 16.521 4.712 16.713C4.52 16.905 4.28267 17.0007 4 17Z"
                fill="white"
              />
            </svg>
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`${
                runtime.listStyle === 'TREE' ? 'opacity-100 bg-[#36343E]' : 'opacity-50'
              } cursor-pointer hover:opacity-50 p-1 min-w-[35px] min-h-[25px] transition-all`}
            >
              <g clip-path="url(#clip0_8_91)">
                <path
                  d="M2.50008 -6.43416e-07C1.8801 -0.000623719 1.28201 0.22914 0.82191 0.644686C0.36181 1.06023 0.0725281 1.63191 0.0102213 2.24875C-0.0520855 2.86559 0.117028 3.48357 0.484733 3.98274C0.852438 4.4819 1.3925 4.82663 2.00008 4.95V10.05C1.39306 10.1739 0.853665 10.5188 0.486478 11.0178C0.119291 11.5168 -0.0495328 12.1344 0.0127364 12.7508C0.0750055 13.3672 0.363932 13.9385 0.8235 14.354C1.28307 14.7694 1.88054 14.9995 2.50008 14.9995C3.11962 14.9995 3.71709 14.7694 4.17665 14.354C4.63622 13.9385 4.92515 13.3672 4.98742 12.7508C5.04969 12.1344 4.88086 11.5168 4.51368 11.0178C4.14649 10.5188 3.6071 10.1739 3.00008 10.05V9H9.50008C10.4283 9 11.3186 8.63125 11.9749 7.97487C12.6313 7.3185 13.0001 6.42826 13.0001 5.5V4.95C13.6071 4.82609 14.1465 4.48121 14.5137 3.9822C14.8809 3.4832 15.0497 2.86564 14.9874 2.24924C14.9251 1.63284 14.6362 1.06151 14.1767 0.646031C13.7171 0.23055 13.1196 0.000509614 12.5001 0.000509614C11.8805 0.000509614 11.2831 0.23055 10.8235 0.646031C10.3639 1.06151 10.075 1.63284 10.0127 2.24924C9.95047 2.86564 10.1193 3.4832 10.4865 3.9822C10.8537 4.48121 11.3931 4.82609 12.0001 4.95V5.5C12.0001 5.8283 11.9354 6.15339 11.8098 6.45671C11.6841 6.76002 11.5 7.03562 11.2678 7.26777C11.0357 7.49991 10.7601 7.68406 10.4568 7.8097C10.1535 7.93534 9.82838 8 9.50008 8H3.00008V4.95C3.60765 4.82663 4.14772 4.4819 4.51542 3.98274C4.88313 3.48357 5.05224 2.86559 4.98993 2.24875C4.92763 1.63191 4.63834 1.06023 4.17824 0.644686C3.71814 0.22914 3.12005 -0.000623719 2.50008 -6.43416e-07Z"
                  fill="white"
                />
              </g>
              <defs>
                <clipPath id="clip0_8_91">
                  <rect width="15" height="15" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
        </div>
      </div>
      <div className="explorer-contents">
        <div className="top-content border-b border-white border-opacity-10 pb-2 w-full mt-2 flex items-center justify-between pl-12 pr-12">
          <p className="min-w-[250px] pl-2 flex items-center">
            <span className="opacity-50">Name</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              className="ml-2 cursor-pointer opacity-50 hover:opacity-100"
              data-tooltip-id="tooltip-item-name"
            >
              <path
                fill="white"
                d="M140 180a12 12 0 1 1-12-12a12 12 0 0 1 12 12ZM128 72c-22.06 0-40 16.15-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.77-20 24-20s24 9 24 20s-10.77 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.72c18.24-3.35 32-17.9 32-35.28c0-19.85-17.94-36-40-36Zm104 56A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88Z"
              />
            </svg>
          </p>
          <p className="min-w-[250px] pl-2 flex items-center">
            <span className="opacity-50">Date Modified</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              className="ml-2 cursor-pointer opacity-50 hover:opacity-100"
              data-tooltip-id="tooltip-item-modified"
            >
              <path
                fill="white"
                d="M140 180a12 12 0 1 1-12-12a12 12 0 0 1 12 12ZM128 72c-22.06 0-40 16.15-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.77-20 24-20s24 9 24 20s-10.77 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.72c18.24-3.35 32-17.9 32-35.28c0-19.85-17.94-36-40-36Zm104 56A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88Z"
              />
            </svg>
          </p>
          <p className="min-w-[250px] pl-2 flex items-center">
            <span className="opacity-50">Kind</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              className="ml-2 cursor-pointer opacity-50 hover:opacity-100"
              data-tooltip-id="tooltip-item-kind"
            >
              <path
                fill="white"
                d="M140 180a12 12 0 1 1-12-12a12 12 0 0 1 12 12ZM128 72c-22.06 0-40 16.15-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.77-20 24-20s24 9 24 20s-10.77 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.72c18.24-3.35 32-17.9 32-35.28c0-19.85-17.94-36-40-36Zm104 56A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88Z"
              />
            </svg>
          </p>
          <p className="min-w-[250px] pl-2 flex items-center">
            <span className="opacity-50">Size</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              className="ml-2 cursor-pointer opacity-50 hover:opacity-100"
              data-tooltip-id="tooltip-item-kind"
            >
              <path
                fill="white"
                d="M140 180a12 12 0 1 1-12-12a12 12 0 0 1 12 12ZM128 72c-22.06 0-40 16.15-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.77-20 24-20s24 9 24 20s-10.77 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.72c18.24-3.35 32-17.9 32-35.28c0-19.85-17.94-36-40-36Zm104 56A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88Z"
              />
            </svg>
          </p>
        </div>
        <div className="flex flex-col overflow-auto h-[89vh]">
          {directories &&
            directories.map((directory, key) => (
              <div
                className="row flex
            px-4 py-2 cursor-pointer transition-all hover:opacity-50 items-center odd:bg-sidebar"
                key={key}
              >
                {directory['Directory'] ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path
                      fill="white"
                      d="M4 20q-.825 0-1.413-.588T2 18V6q0-.825.588-1.413T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.588 1.413T20 20H4Z"
                    />
                  </svg>
                ) : (
                  <SmartFileIcon file={directory} />
                )}
                <div
                  className="ml-4 flex items-center justify-between w-full pr-12"
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
                    } else if (directory['File']) {
                      invoke('open_file', {
                        path: directory['File']![1],
                      })
                        .then((_) => {})
                        .catch((err) => {
                          toast.error(err);
                        });
                    }
                  }}
                >
                  <p className="min-w-[250px] text-ellipsis truncate w-[250px]">
                    {directory['Directory'] ? directory['Directory'][0] : directory['File']![0]}
                  </p>
                  <Moment
                    fromNow
                    date={secondsAgoToDate(
                      directory['Directory'] ? directory['Directory']![3] : directory['File']![3],
                    ).toISOString()}
                    className="min-w-[250px] flex justify-left opacity-50 pl-2"
                  />
                  <p className="min-w-[250px] flex justify-left opacity-50 pl-6">
                    {directory['Directory']
                      ? directory['Directory']![4] === 'File'
                        ? 'Folder'
                        : directory['Directory']![4]
                      : directory['File']![4]}
                  </p>
                  <p className="opacity-50 min-w-[250px] flex justify-left pl-8">
                    {directory['Directory']
                      ? formatBytes(directory['Directory']![2])
                      : formatBytes(directory['File']![2])}
                  </p>
                </div>
              </div>
            ))}
        </div>
        <Tooltip id="tooltip-item-name" content="This is the file or folder name" opacity={100} />
        <Tooltip id="tooltip-item-kind" content="This is the type of the entry" opacity={100} />
        <Tooltip
          id="tooltip-item-size"
          content="This is the size of the file or files inside a folder exlcluding subdirectories"
          opacity={100}
        />
        <Tooltip id="tooltip-item-modified" content="This is the last time the entry was modified" opacity={100} />
      </div>
    </div>
  );
};
