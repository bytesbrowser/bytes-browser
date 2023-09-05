import { invoke, os } from '@tauri-apps/api';
import { Event, listen } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';
import { Triangle } from 'react-loader-spinner';
import { useParams } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useRecoilState } from 'recoil';

import { useHotkey } from '../lib/commands';
import BookmarksEmitter from '../lib/emitters/bookmarks.emitter';
import TagsEmitter from '../lib/emitters/tags.emitter';
import useTimer from '../lib/hooks/useTimer';
import { runtimeState } from '../lib/state/runtime.state';
import { BookmarkDoc, Device as DeviceInterface, Profile, ProfileStore, TagDoc } from '../lib/types';
import { Device } from './Device';
import { SearchModal } from './SearchModal';
import { SidebarBookmarks } from './SidebarBookmarks';
import { SidebarBottom } from './SidebarBottom';
import { SidebarTags } from './SidebarTags';
import { TimeText } from './TimeText';

export const RouterLayout = ({ children }: { children: React.ReactNode }) => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const { start, reset, pause, seconds } = useTimer();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMac, setIsMac] = useState(false);

  const { driveId, path, mount } = useParams();

  const [tauriLoadEventMessage, setTauriLoadEventMessage] = useState<string | null>(null);

  useHotkey('CommandOrControl+Shift+Space', (_shortcut) => {
    setRuntime({
      ...runtime,
      searchOpen: true,
    });
  });

  const [tags, setTags] = useState<TagDoc[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkDoc[]>([]);
  const [refreshingVolumes, setRefreshingVolumes] = useState<boolean>(false);

  useEffect(() => {
    os.platform().then((platform) => setIsMac(platform === 'darwin'));

    if (!profile) {
      updateProfile();
    }

    if (runtime.readVolumes || runtime.devices.length > 0) return;

    reset();
    start();

    getVolumes();
    getUserStore();
  }, [runtime]);

  useEffect(() => {
    updateProfile();
  }, [runtime.currentUser]);

  useEffect(() => {
    if (
      runtime.currentDrive &&
      runtime.devices[driveId as any] &&
      runtime.currentDrive.name !== runtime.devices[driveId as any].name
    ) {
      setRuntime({
        ...runtime,
        currentDrive: runtime.devices[driveId as any],
      });
    }
  }, [driveId]);

  const getUserStore = async () => {
    if (runtime.store) {
      const db = await runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`);

      if (db) {
        setTags(db.tags ?? []);
        setBookmarks(db.bookmarks ?? []);
      }
    }
  };

  useEffect(() => {
    BookmarksEmitter.on('change', () => {
      getUserStore();
    });

    TagsEmitter.on('change', () => {
      getUserStore();
    });

    appWindow.listen('get_volumes_event', (msg: Event<string>) => {
      setTauriLoadEventMessage(msg.payload);
    });
  }, []);

  const updateProfile = async () => {
    if (runtime.profileStore) {
      const profiles = await runtime.profileStore.get<Profile[]>(`profiles`);

      if (profiles) {
        const profile = profiles[runtime.currentUser];
        setProfile(profile);
      }
    }
  };

  const getVolumes = () => {
    if (refreshingVolumes) return;

    invoke('get_volumes').then((volumes: any) => {
      const new_volumes: DeviceInterface[] = [];

      for (const volume of volumes) {
        if (new_volumes.find((vol) => vol.name === volume.name)) {
          continue;
        } else {
          new_volumes.push(volume);
        }
      }

      setRuntime({
        ...runtime,
        readVolumes: true,
        currentDrive: new_volumes[0]!,
        devices: new_volumes,
      });

      pause();
    });
  };

  const refreshVolumes = () => {
    if (refreshingVolumes) return;

    setRefreshingVolumes(true);

    invoke('get_volumes').then((volumes: any) => {
      const new_volumes: DeviceInterface[] = [];

      for (const volume of volumes) {
        if (new_volumes.find((vol) => vol.name === volume.name)) {
          continue;
        } else {
          new_volumes.push(volume);
        }
      }

      setRuntime({
        ...runtime,
        currentDrive: new_volumes[0]!,
        devices: new_volumes,
      });

      setRefreshingVolumes(false);
    });
  };

  return (
    <>
      <SearchModal
        show={runtime.searchOpen}
        setShow={(show) =>
          setRuntime({
            ...runtime,
            searchOpen: show,
          })
        }
      />
      <Tooltip id="refresh-tooltip" className="tooltip z-[999]" opacity={'100%'}>
        Refresh
      </Tooltip>
      {runtime.readVolumes ? (
        <div className="layout flex">
          <div
            className="sidebar min-w-[300px] h-screen px-8 pb-8 flex flex-col justify-between shadow-lg"
            style={{
              backgroundColor: 'var(--sidebar-bg)',
            }}
          >
            <div className="section">
              <div
                className={`search flex items-center py-2 px-2 w-full mb-8 rounded-md mr-4 border hover:opacity-100 transition-all cursor-pointer ${
                  isMac && 'mt-4'
                }`}
                style={{
                  backgroundColor: 'var(--sidebar-bg)',
                  opacity: 'var(--light-text-opacity)',
                  borderColor: 'var(--sidebar-border-color)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16.148 15.352L12.6275 11.8322C13.6479 10.6071 14.1567 9.03585 14.0481 7.4452C13.9395 5.85456 13.2218 4.36701 12.0444 3.29201C10.867 2.21701 9.32041 1.63734 7.72647 1.67356C6.13253 1.70978 4.61392 2.35913 3.48654 3.4865C2.35916 4.61388 1.70982 6.13249 1.6736 7.72643C1.63737 9.32037 2.21705 10.8669 3.29205 12.0444C4.36705 13.2218 5.85459 13.9394 7.44524 14.048C9.03589 14.1566 10.6072 13.6478 11.8322 12.6274L15.3521 16.148C15.4043 16.2002 15.4664 16.2417 15.5347 16.27C15.6029 16.2983 15.6761 16.3128 15.75 16.3128C15.8239 16.3128 15.8971 16.2983 15.9654 16.27C16.0337 16.2417 16.0957 16.2002 16.148 16.148C16.2003 16.0957 16.2417 16.0337 16.27 15.9654C16.2983 15.8971 16.3129 15.8239 16.3129 15.75C16.3129 15.6761 16.2983 15.6029 16.27 15.5346C16.2417 15.4663 16.2003 15.4043 16.148 15.352ZM2.81254 7.875C2.81254 6.87373 3.10945 5.89495 3.66572 5.06243C4.222 4.2299 5.01265 3.58103 5.9377 3.19786C6.86275 2.81469 7.88065 2.71444 8.86268 2.90977C9.84471 3.10511 10.7468 3.58727 11.4548 4.29527C12.1628 5.00328 12.6449 5.90533 12.8403 6.88736C13.0356 7.86938 12.9353 8.88728 12.5522 9.81234C12.169 10.7374 11.5201 11.528 10.6876 12.0843C9.85509 12.6406 8.87631 12.9375 7.87504 12.9375C6.53284 12.936 5.24603 12.4022 4.29695 11.4531C3.34787 10.504 2.81403 9.2172 2.81254 7.875Z"
                    fill="var(--icon-color)"
                    fillOpacity="var(--icon-light-opacity)"
                  />
                </svg>
                <p
                  className="text-sm ml-4"
                  style={{
                    opacity: 'var(--light-text-opacity)',
                  }}
                  onClick={() => {
                    setRuntime({
                      ...runtime,
                      searchOpen: true,
                    });
                  }}
                >
                  Search{' '}
                  <span
                    className="text-xs bg-gray-600 py-1 px-2 rounded ml-2"
                    style={{
                      backgroundColor: 'var(--sidebar-inset-bg)',
                      color: 'var(--sidebar-inset-text-color)',
                    }}
                  >
                    {isMac ? '⌘' : 'ctrl'} + shift + space
                  </span>
                </p>
              </div>
              <div className="section-title text-sm flex justify-between items-center">
                <p
                  style={{
                    opacity: 'var(--light-text-opacity)',
                  }}
                >
                  Storage Devices
                </p>
                <svg
                  onClick={refreshVolumes}
                  data-tooltip-id="refresh-tooltip"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  className={`cursor-pointer hover:opacity-100 focus:border-none focus:outline-none ${
                    refreshingVolumes && 'animate-spin'
                  }`}
                >
                  <path
                    fill="var(--icon-color)"
                    d="M12.079 2.25c-4.794 0-8.734 3.663-9.118 8.333H2a.75.75 0 0 0-.528 1.283l1.68 1.666a.75.75 0 0 0 1.056 0l1.68-1.666a.75.75 0 0 0-.528-1.283h-.893c.38-3.831 3.638-6.833 7.612-6.833a7.658 7.658 0 0 1 6.537 3.643a.75.75 0 1 0 1.277-.786A9.158 9.158 0 0 0 12.08 2.25Zm8.762 8.217a.75.75 0 0 0-1.054 0L18.1 12.133a.75.75 0 0 0 .527 1.284h.899c-.382 3.83-3.651 6.833-7.644 6.833a7.697 7.697 0 0 1-6.565-3.644a.75.75 0 1 0-1.277.788a9.197 9.197 0 0 0 7.842 4.356c4.808 0 8.765-3.66 9.15-8.333H22a.75.75 0 0 0 .527-1.284l-1.686-1.666Z"
                  />
                </svg>
              </div>
              <div className="mt-8">
                {runtime.devices.map((device, key) => (
                  <Device
                    device={device}
                    key={key}
                    id={key}
                    selected={runtime.currentDrive?.name === device.name ?? false}
                  />
                ))}
              </div>
              <SidebarTags tags={tags} loading={runtime.readTags} />
              <SidebarBookmarks bookmarks={bookmarks} loading={runtime.readBookmarks} />
            </div>
            {profile && <SidebarBottom profile={profile} />}
          </div>
          <div
            className="content flex-1 h-screen text-white"
            style={{
              backgroundColor: 'var(--primary-bg)',
            }}
          >
            {children}
          </div>
        </div>
      ) : (
        <div
          className="loader flex justify-center items-center h-screen flex-col w-screen"
          style={{
            backgroundColor: 'var(--primary-bg)',
          }}
        >
          <Triangle height="80" width="80" color="var(--icon-color)" ariaLabel="triangle-loading" visible={true} />
          <p
            className="mt-8"
            style={{
              opacity: 'var(--light-text-opacity)',
            }}
          >
            {tauriLoadEventMessage ?? 'Getting things ready...'}
          </p>
          <TimeText seconds={seconds} className="mt-8 opacity-50" prefix="Elapsed Caching Time:" />
        </div>
      )}
    </>
  );
};
