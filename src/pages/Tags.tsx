import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { ProfileStore, TagDoc } from '../lib/types';

export const Tags = () => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);

  const { tagId } = useParams();

  const [tag, setTag] = useState<TagDoc | null>(null);

  const [results, setResults] = useState([]);

  useEffect(() => {
    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        const tags = db.tags ? db.tags : [];
        const tag = tags.find((tag) => tag.uuid === tagId);
        if (tag) {
          setTag(tag);
          console.log(tag);

          if (tag.file_paths.length > 0) {
            invoke('get_files_for_paths', { paths: tag.file_paths.map((tag) => tag.mount_point + tag.path) })
              .then((res) => {
                console.log(res);
              })
              .catch((err) => {
                console.error(err);
              });
          }
        }
      }
    });
  }, [tagId]);

  return (
    <div className="folder-explorer h-[96.5vh] overflow-hidden animate__animated animate__fadeIn animate__faster p-8">
      <div className=" border-b border-white border-opacity-10 pb-4 mb-4">
        <h1 className="text-lg">
          Results tagged with{' '}
          <span
            style={{
              color: tag?.color_hex,
            }}
          >
            {tag?.identifier}
          </span>
        </h1>
        <p className="mt-3 text-sm opacity-50">{tag?.file_paths.length} results</p>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col"></div>
        </div>
      </div>
    </div>
  );
};
