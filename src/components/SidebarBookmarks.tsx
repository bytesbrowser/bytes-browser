import { Link } from "react-router-dom";
import { FallingLines } from "react-loader-spinner";
import { BookmarkDoc } from "../lib/types";

export const SidebarBookmarks = ({
  bookmarks,
  loading,
}: {
  bookmarks: BookmarkDoc[];
  loading: boolean;
}) => {
  return (
    <div className="mt-14">
      <div className="section-title text-sm opacity-50 mb-4">Bookmarks</div>
      {loading && <FallingLines color="white" />}
      {bookmarks.length === 0 && !loading && (
        <>
          <p className="text-xs opacity-50">No bookmarks have been created</p>
        </>
      )}
      {bookmarks.map((bookmark, key) => (
        <Link
          key={key}
          to={`/bookmarks/${bookmark.uuid}`}
          className="flex items-center cursor-pointer transition-all hover:opacity-100 opacity-50"
        >
          <div className="circle rounded-full bg-red-600 w-[12px] h-[12px] mr-4"></div>
          <span>{bookmark.identifier}</span>
        </Link>
      ))}
    </div>
  );
};
