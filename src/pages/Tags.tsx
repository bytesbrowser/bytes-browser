import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { SmartFileIcon } from '../components/SmartFileIcon';
import TagsEmitter from '../lib/emitters/tags.emitter';
import { runtimeState } from '../lib/state/runtime.state';
import { DirectoryContents, ProfileStore, TagDoc, TagPathResults } from '../lib/types';
import { formatLongText } from '../lib/utils/formatLongText';
import { removeLastCharOf } from '../lib/utils/removeLastCharOf';

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

  const onDeleteTag = async (tag: TagDoc) => {
    if (!tag) return;

    const continueDelete = await confirm(`Are you sure you want to delete the tag ${tag.identifier}?`);

    if (!continueDelete) return;

    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        const tags = db.tags ? db.tags : [];
        const tagIndex = tags.findIndex((tag) => tag.uuid === tagId);
        if (tagIndex > -1) {
          tags.splice(tagIndex, 1);

          await runtime.store.set(`profile-store-${runtime.currentUser}`, {
            ...db,
            tags,
          });

          await runtime.store.save();

          toast.success(`Tag ${tag.identifier} deleted!`);

          TagsEmitter.emit('change', {});

          navigate(`/drive/0`);
        }
      }
    });
  };

  return (
    <div className="folder-explorer h-[96.5vh] overflow-hidden animate__animated animate__fadeIn animate__faster p-8">
      <div className=" border-b border-white border-opacity-10 pb-4 mb-4">
        <div className="flex justify-between items-center">
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
          <button
            onClick={() => onDeleteTag(tag!)}
            className="bg-white text-error p-2 rounded opacity-100 text-xs hover:opacity-50 transition-all"
          >
            Delete Tag
          </button>
        </div>
        <p className="mt-3 text-sm opacity-50">
          {tag?.file_paths.length} result{tag && tag?.file_paths.length > 1 && 's'}
        </p>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {results?.map(
              (result, key) =>
                result.File && (
                  <div className="flex items-center cursor-pointer justify-between opacity-50 hover:ml-2 hover:opacity-100 transition-all">
                    <div className="flex items-center">
                      <SmartFileIcon file={result} />
                      <p
                        className="ml-2"
                        onClick={() => {
                          const device = runtime.devices.find((device) => {
                            return device.mount_point.includes(
                              result['Directory']
                                ? result['Directory']![1].slice(0, 1)
                                : result['File']![1].slice(0, 2),
                            );
                          });

                          if (!device) return;

                          const deviceIndex = runtime.devices.findIndex((device) => {
                            return device.mount_point.includes(
                              result['Directory']
                                ? result['Directory']![1].slice(0, 1)
                                : result['File']![1].slice(0, 2),
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
                        {result.File![0]}
                      </p>
                    </div>
                    <p className="w-1/2 flex items-center justify-end mr-2">
                      {removeLastCharOf(formatLongText(result['File']![1], 45))}
                    </p>
                  </div>
                ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
