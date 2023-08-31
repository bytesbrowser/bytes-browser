import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { DirectoryContents, ProfileStore, TagDoc, TagPathResults } from '../lib/types';
import { removeAllAfterLastSlash } from '../lib/utils/removeAllAfterLastSlash';

export const Tags = () => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);

  const navigate = useNavigate();

  const { tagId } = useParams();

  const [tag, setTag] = useState<TagDoc | null>(null);

  const [results, setResults] = useState<DirectoryContents[]>();

  useEffect(() => {
    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        const tags = db.tags ? db.tags : [];
        const tag = tags.find((tag) => tag.uuid === tagId);
        if (tag) {
          setTag(tag);
          console.log(tag);

          if (tag.file_paths.length > 0) {
            invoke<TagPathResults>('get_files_for_paths', {
              paths: tag.file_paths.map((tag) => tag.mount_point + tag.path),
            })
              .then((res) => {
                let resultsArr: DirectoryContents[] = [];
                for (const [_, val] of Object.entries(res)) {
                  //@ts-ignore
                  resultsArr.push(val.data[0]);
                }

                console.log(resultsArr);

                setResults(resultsArr);
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
          <div className="flex flex-col">
            {results?.map(
              (result, key) =>
                result.File && (
                  <p
                    onClick={() => {
                      const device = runtime.devices.find((device) => {
                        return device.mount_point.includes(
                          result['Directory'] ? result['Directory']![1].slice(0, 1) : result['File']![1].slice(0, 2),
                        );
                      });

                      if (!device) return;

                      const deviceIndex = runtime.devices.findIndex((device) => {
                        return device.mount_point.includes(
                          result['Directory'] ? result['Directory']![1].slice(0, 1) : result['File']![1].slice(0, 2),
                        );
                      });

                      navigate(
                        `/drive/${deviceIndex}?path=${encodeURIComponent(
                          result['File']![1] === '/'
                            ? ''
                            : result['File']![1].replace(result['File']![0], '').replace(device?.mount_point, ''),
                        )}&mount=${encodeURIComponent(device.mount_point)}`,
                      );
                    }}
                    key={key}
                  >
                    {result.File![1]}
                  </p>
                ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
