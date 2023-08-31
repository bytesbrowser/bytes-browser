import { useState } from 'react';
import { FallingLines } from 'react-loader-spinner';
import { Link } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import TagsEmitter from '../lib/emitters/tags.emitter';
import { runtimeState } from '../lib/state/runtime.state';
import { ProfileStore, TagDoc } from '../lib/types';
import { generateUUID } from '../lib/utils/generateUUID';
import { getRandomHexColor } from '../lib/utils/getRandomHex';

export const SidebarTags = ({ tags, loading }: { tags: TagDoc[]; loading: boolean }) => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [creating, setCreating] = useState(false);
  const [creatingTagColor, setCreatingTagColor] = useState('');

  const onCreateStart = () => {
    setCreating(true);
    setCreatingTagColor(getRandomHexColor());
  };

  const onCreate = async (text: string) => {
    setCreating(false);

    await runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        const tags = db.tags ? db.tags : [];

        tags.push({
          uuid: generateUUID(),
          file_paths: [],
          identifier: text,
          color_hex: creatingTagColor,
        });

        await runtime.store.set(`profile-store-${runtime.currentUser}`, {
          ...db,
          tags,
        });

        await runtime.store.save();

        TagsEmitter.emit('change', {});
      } else {
        await runtime.store.set(`profile-store-${runtime.currentUser}`, {
          tags: [
            {
              uuid: generateUUID(),
              file_paths: [],
              identifier: text,
              color_hex: creatingTagColor,
            },
          ],
        });

        await runtime.store.save();

        TagsEmitter.emit('change', {});
      }
    });
  };

  return (
    <div className="mt-14">
      <div className="section-title text-sm opacity-50 mb-4">Tags</div>
      {loading && <FallingLines color="white" />}
      {tags.length === 0 && !loading && (
        <>
          <p className="text-xs opacity-50">No tags have been created</p>
        </>
      )}
      {creating && (
        <div className="flex items-center cursor-pointer transition-all hover:opacity-100 opacity-50 mt-4 mb-3">
          <div
            className="circle rounded-full w-[12px] h-[12px] mr-4"
            style={{
              backgroundColor: creatingTagColor,
            }}
          ></div>

          <span
            contentEditable
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.currentTarget.textContent === null) return;
                if (e.currentTarget.textContent === '') return;

                onCreate(e.currentTarget.textContent!);
              } else if (e.key === 'Escape') {
                setCreating(false);
              }
            }}
            className="border flex-1 rounded text-sm focus:outline-none"
          >
            New Tag
          </span>
        </div>
      )}
      {tags.map((tag, key) => (
        <Link
          key={key}
          to={`/tags/${tag.uuid}`}
          className="flex items-center cursor-pointer transition-all hover:opacity-100 opacity-50 mb-3"
        >
          <div
            className="circle rounded-full w-[12px] h-[12px] mr-4"
            style={{
              backgroundColor: tag.color_hex,
            }}
          ></div>
          <span className="text-sm">{tag.identifier}</span>
        </Link>
      ))}
      <div className="w-full border border-gray-500 opacity-50 hover:opacity-100 transition-all cursor-pointer p-2 rounded-md mt-4">
        <p className="text-sm text-center" onClick={onCreateStart}>
          Create A Tag
        </p>
      </div>
    </div>
  );
};
