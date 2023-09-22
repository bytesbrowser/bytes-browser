import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { Item, Menu, Separator, Submenu } from 'react-contexify';
import { toast } from 'react-hot-toast';
import { useRecoilState } from 'recoil';

import BookmarksEmitter from '../lib/emitters/bookmarks.emitter';
import DirectoryEmitter from '../lib/emitters/directory.emitter';
import { runtimeState } from '../lib/state/runtime.state';
import { ProfileStore } from '../lib/types';
import { generateUUID } from '../lib/utils/generateUUID';

export const PageContextMenu = ({
  sortMode,
  setSortMode,
}: {
  sortMode: 'ASC' | 'DESC' | 'NONE' | 'SIZE' | 'TYPE';
  setSortMode: (mode: any) => void;
}) => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [isBookMarked, setIsBookMarked] = useState(false);

  useEffect(() => {
    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then((db) => {
      if (db) {
        const bookmarks = db.bookmarks ?? [];

        bookmarks.find((bookmark) => bookmark.file_path === runtime.currentPath)
          ? setIsBookMarked(true)
          : setIsBookMarked(false);
      }
    });
  }, [runtime]);

  const onBookmark = async () => {
    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        if (!runtime.currentDrive) {
          return;
        }

        let bookmarks = [...db.bookmarks];

        const index = bookmarks.findIndex((bookmark) => bookmark.file_path === runtime.currentPath);

        if (index !== -1) {
          bookmarks = bookmarks.filter((bookmark) => bookmark.file_path !== runtime.currentPath);

          await runtime.store.set(`profile-store-${runtime.currentUser}`, {
            ...db,
            bookmarks,
          });

          await runtime.store.save();

          setIsBookMarked(false);
          toast.success(`${runtime.currentDrive.mount_point + runtime.currentPath} removed from bookmarks`);

          BookmarksEmitter.emit('change', {});
        } else {
          if (!runtime.currentDrive) {
            return;
          }

          bookmarks.push({
            file_path: runtime.currentPath,
            identifier: runtime.currentPath,
            uuid: generateUUID(),
            mount_point: runtime.currentDrive.mount_point,
          });

          await runtime.store.set(`profile-store-${runtime.currentUser}`, {
            ...db,
            bookmarks,
          });

          await runtime.store.save();

          setIsBookMarked(true);
          toast.success(`${runtime.currentDrive.mount_point + runtime.currentPath} added to bookmarks`);

          BookmarksEmitter.emit('change', {});
        }
      } else {
        if (!runtime.currentDrive) {
          return;
        }

        await runtime.store.set(`profile-store-${runtime.currentUser}`, {
          bookmarks: [
            {
              file_path: runtime.currentPath,
              identifier: runtime.currentPath,
              uuid: generateUUID(),
              mount_point: runtime.currentDrive.mount_point,
            },
          ],
        });

        await runtime.store.save();

        setIsBookMarked(true);
        toast.success(`${runtime.currentDrive.mount_point + runtime.currentPath} added to bookmarks`);

        BookmarksEmitter.emit('change', {});
      }
    });
  };

  const handleEmptyTrash = () => {
    invoke('clear_recycle_bin')
      .then(() => {
        DirectoryEmitter.emit('refresh', { from: 'context-menu-empty-trash' });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <Menu id="PAGE_MENU" theme="dark" animation="slide" className="text-sm">
      <Item id="bookmark" onClick={onBookmark} disabled={runtime.currentPath === ''}>
        <div className="flex justify-between items-center w-full">
          <p
            style={{
              color: 'var(--sidebar-inset-text-color)',
              opacity: 'var(--light-text-opacity)',
            }}
          >
            {isBookMarked && 'Remove '}Bookmark
          </p>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="white" d="M5 21V5q0-.825.588-1.413T7 3h10q.825 0 1.413.588T19 5v16l-7-3l-7 3Z" />
          </svg>
        </div>
      </Item>
      <Separator />
      {runtime.isInRecycleBin && (
        <Item id="empty-trash" disabled={!runtime.isInRecycleBin} onClick={handleEmptyTrash}>
          <div className="flex justify-between items-center w-full">
            <p
              style={{
                color: 'var(--sidebar-inset-text-color)',
                opacity: 'var(--light-text-opacity)',
              }}
            >
              {' '}
              Empty Trash
            </p>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="white"
                d="m20.37 8.91l-1 1.73l-12.13-7l1-1.73l3.04 1.75l1.36-.37l4.33 2.5l.37 1.37l3.03 1.75M6 19V7h5.07L18 11v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"
              />
            </svg>
          </div>
        </Item>
      )}
      <Item
        id="refresh"
        onClick={() => {
          DirectoryEmitter.emit('refresh', { from: 'context-menu-refresh-dir' });
        }}
      >
        <div className="flex justify-between items-center w-full">
          <p
            style={{
              color: 'var(--sidebar-inset-text-color)',
              opacity: 'var(--light-text-opacity)',
            }}
          >
            Refresh Directory
          </p>
          <svg
            data-tooltip-id="refresh-tooltip"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="white"
              d="M12.079 2.25c-4.794 0-8.734 3.663-9.118 8.333H2a.75.75 0 0 0-.528 1.283l1.68 1.666a.75.75 0 0 0 1.056 0l1.68-1.666a.75.75 0 0 0-.528-1.283h-.893c.38-3.831 3.638-6.833 7.612-6.833a7.658 7.658 0 0 1 6.537 3.643a.75.75 0 1 0 1.277-.786A9.158 9.158 0 0 0 12.08 2.25Zm8.762 8.217a.75.75 0 0 0-1.054 0L18.1 12.133a.75.75 0 0 0 .527 1.284h.899c-.382 3.83-3.651 6.833-7.644 6.833a7.697 7.697 0 0 1-6.565-3.644a.75.75 0 1 0-1.277.788a9.197 9.197 0 0 0 7.842 4.356c4.808 0 8.765-3.66 9.15-8.333H22a.75.75 0 0 0 .527-1.284l-1.686-1.666Z"
            />
          </svg>
        </div>
      </Item>
      <Item
        id="show-hidden"
        onClick={() => {
          setRuntime({
            ...runtime,
            showHiddenFiles: !runtime.showHiddenFiles,
          });

          DirectoryEmitter.emit('refresh', { from: 'context-menu-show-hidden' });
        }}
      >
        {runtime.showHiddenFiles ? "Don't Show Hidden Files" : 'Show Hidden Files'}
      </Item>
      <Separator />
      <Submenu label="Sort By">
        <Item disabled={sortMode === 'NONE'} onClick={() => setSortMode('NONE')}>
          None
        </Item>
        <Item disabled={sortMode === 'ASC'} onClick={() => setSortMode('ASC')}>
          Ascending (Alphabetical)
        </Item>
        <Item disabled={sortMode === 'DESC'} onClick={() => setSortMode('DESC')}>
          Descending (Alphabetical)
        </Item>
        <Item disabled={sortMode === 'SIZE'} onClick={() => setSortMode('SIZE')}>
          Size
        </Item>
        <Item disabled={sortMode === 'TYPE'} onClick={() => setSortMode('TYPE')}>
          Type
        </Item>
      </Submenu>
      <Item
        onClick={() =>
          setRuntime({
            ...runtime,
            commandBuilderOpen: true,
          })
        }
      >
        Command Routines
      </Item>
    </Menu>
  );
};
