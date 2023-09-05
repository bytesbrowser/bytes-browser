import { FallingLines } from 'react-loader-spinner';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useRecoilValue } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { BookmarkDoc } from '../lib/types';

export const SidebarBookmarks = ({ bookmarks, loading }: { bookmarks: BookmarkDoc[]; loading: boolean }) => {
  const runtime = useRecoilValue(runtimeState);

  const getDriveId = (bookmark: BookmarkDoc) => {
    const device = runtime.devices.find((device) => {
      return device.mount_point.includes(bookmark.mount_point);
    });

    if (!device) return;

    const deviceIndex = runtime.devices.indexOf(device);

    return deviceIndex;
  };

  return (
    <div className="mt-14">
      <div
        className="section-title text-sm mb-4"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        Bookmarks
      </div>
      {loading && <FallingLines color="white" />}
      {bookmarks.length === 0 && !loading && (
        <>
          <p
            className="text-xs"
            style={{
              opacity: 'var(--light-text-opacity)',
            }}
          >
            No bookmarks have been created
          </p>
        </>
      )}
      {bookmarks.map((bookmark, key) => (
        <Link
          data-tooltip-id="bookmark-tooltip"
          data-tooltip-content={bookmark.mount_point + bookmark.file_path}
          key={key}
          to={`/drive/${getDriveId(bookmark)}/?path=${encodeURIComponent(
            bookmark.file_path,
          )}&mount=${encodeURIComponent(bookmark.mount_point)}`}
          className="flex items-center cursor-pointer transition-all hover:opacity-100 mb-3"
          style={{
            opacity: 'var(--light-text-opacity)',
          }}
        >
          <div className="circle rounded-full bg-red-600 w-[12px] h-[12px] mr-4"></div>
          <span className="truncate max-w-[200px]">{bookmark.identifier}</span>
        </Link>
      ))}
      <Tooltip id="bookmark-tooltip" className="tooltip z-[999]" opacity={'100%'} />
    </div>
  );
};
