import { Link } from "react-router-dom";
import { TagDoc } from "../lib/types";
import { FallingLines } from "react-loader-spinner";

export const SidebarTags = ({ tags, loading}: { tags: TagDoc[], loading: boolean }) => {
  return (
    <div className="mt-14">
      <div className="section-title text-sm opacity-50 mb-4">Tags</div>
      {loading && (
        <FallingLines color="white" />
      )}
      {tags.length === 0 && !loading && (
        <>
          <p className="text-xs opacity-50">No tags have been created</p>
        </>
      )}
      {tags.map((tag, key) => (
        <Link key={key} to={`/tags/${tag.uuid}`} className="flex items-center cursor-pointer transition-all hover:opacity-100 opacity-50">
          <div className="circle rounded-full bg-red-600 w-[12px] h-[12px] mr-4"></div>
          <span>{tag.identifier}</span>
        </Link>
      ))}
      <div className="w-full border border-gray-500 opacity-50 hover:opacity-100 transition-all cursor-pointer p-2 rounded-md mt-4">
        <p className="text-sm text-center">Create A Tag</p>
      </div>
    </div>
  );
};
