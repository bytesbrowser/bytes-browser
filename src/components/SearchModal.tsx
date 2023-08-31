import { invoke } from '@tauri-apps/api';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { InfinitySpin } from 'react-loader-spinner';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { DirectoryContents, ProfileStore, SearchResult } from '../lib/types';
import { formatLongText } from '../lib/utils/formatLongText';
import { removeAllAfterLastSlash } from '../lib/utils/removeAllAfterLastSlash';
import { removeLastCharOf } from '../lib/utils/removeLastCharOf';
import { SmartFileIcon } from './SmartFileIcon';

export const SearchModal = ({ show, setShow }: { show: boolean; setShow: (show: boolean) => void }) => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [sortedResults, setSortedResults] = useState<SearchResult | null>(null);

  const [showFilterForm, setShowFilterForm] = useState<boolean>(false);
  const [searchOptions, setSearchOptions] = useState({
    directories: false,
    files: true,
  });
  const [sortBy, setSortBy] = useState<'Name' | 'Date' | 'Size' | 'Relevance'>('Name');

  const navigate = useNavigate();

  useEffect(() => {
    if (runtime.store) {
      runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then((db) => {
        if (db) {
          if (db.recentSearches) {
            setRecentSearches(db.recentSearches);
          }
        } else {
          const newDb = {
            bookmarks: [],
            tags: [],
            recentSearches: [],
          };

          runtime.store?.set(`profile-store-${runtime.currentUser}`, newDb).then(() => {
            setRecentSearches(newDb.recentSearches);
          });
        }
      });
    }
  }, [show]);

  const updateRecentSearches = (search: string) => {
    if (runtime.store) {
      runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then((db) => {
        if (db) {
          if (db.recentSearches.includes(search)) {
            return;
          }

          db.recentSearches = [...db.recentSearches, search];
          setRecentSearches(db.recentSearches);
          runtime.store?.set(`profile-store-${runtime.currentUser}`, db);
        }
      });
    }
  };

  const onSearch = (e?: FormEvent, overide?: string) => {
    e?.preventDefault();

    setSearching(true);

    invoke<SearchResult>('search_directory', {
      query: overide ? overide : searchValue,
      mountPnt: runtime.currentDrive?.mount_point,
      acceptFiles: searchOptions.files,
      acceptDirectories: searchOptions.directories,
    })
      .then((res) => {
        setSearching(false);

        let sorted: DirectoryContents[] = [];

        if (sortBy === 'Name') {
          sorted = [...res.results].sort((a, b) => {
            const nameA = a.Directory ? a.Directory[0] : a.File ? a.File[0] : '';
            const nameB = b.Directory ? b.Directory[0] : b.File ? b.File[0] : '';

            return nameA.localeCompare(nameB);
          });
        } else if (sortBy === 'Date') {
          sorted = [...res.results].sort((a, b) => {
            const nameA = a.Directory ? a.Directory[3] : a.File ? a.File[3] : '';
            const nameB = b.Directory ? b.Directory[3] : b.File ? b.File[3] : '';

            return nameA < nameB ? 1 : -1;
          });
        } else if (sortBy === 'Size') {
          sorted = [...res.results].sort((a, b) => {
            const nameA = a.Directory ? a.Directory[2] : a.File ? a.File[2] : '';
            const nameB = b.Directory ? b.Directory[2] : b.File ? b.File[2] : '';

            return nameA < nameB ? 1 : -1;
          });
        } else if (sortBy === 'Relevance') {
          sorted = [...res.results];
        }

        setSortedResults({
          ...res,
          results: sorted,
        });
        setResults(res);
      })
      .catch((err) => {
        console.error(err);
        toast.error('There was an error with your search.');
        setSearching(false);
        setResults(null);
        setSortedResults(null);
      });

    updateRecentSearches(searchValue);
  };

  const deleteRecentSearch = (index: number) => {
    if (runtime.store) {
      runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then((db) => {
        if (db) {
          db.recentSearches.splice(index, 1);
          setRecentSearches(db.recentSearches);
          runtime.store?.set(`profile-store-${runtime.currentUser}`, db);
        }
      });
    }
  };

  const clickedSearch = (result: DirectoryContents) => {
    const device = runtime.devices.find((device) => {
      return device.mount_point.includes(
        result['Directory'] ? result['Directory']![1].slice(0, 1) : result['File']![1].slice(0, 2),
      );
    });

    const deviceIndex = runtime.devices.findIndex((device) => {
      return device.mount_point.includes(
        result['Directory'] ? result['Directory']![1].slice(0, 1) : result['File']![1].slice(0, 2),
      );
    });

    if (device) {
      setShow(false);

      navigate(
        `/drive/${deviceIndex}?path=${encodeURIComponent(
          result['Directory']
            ? result['Directory']![1] === '/'
              ? ''
              : removeAllAfterLastSlash(result['Directory']![1].replace(result['Directory']![1].slice(0, 2), ''))
            : result['File']![1] === '/'
            ? ''
            : removeAllAfterLastSlash(result['File']![1].replace(device?.mount_point, '')),
        )}&mount=${encodeURIComponent(device.mount_point)}`,
      );
    }
  };

  return (
    <Modal
      isOpen={show}
      onRequestClose={() => {
        setShow(false);
      }}
      style={{
        content: {
          background: 'radial-gradient(circle, rgba(28,27,32,0.9) 0%, rgba(25,25,24,1) 100%)',
          border: 'none',
          padding: 0,
          width: '60%',
          height: 'min-content',
          margin: 'auto',
          borderRadius: '12px',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <div className="animate__animated animate__fadeIn animate__faster pb-8">
        <div className="top border-b border-white border-opacity-10 p-4 flex items-center justify-between">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16.148 15.352L12.6275 11.8322C13.6479 10.6071 14.1567 9.03585 14.0481 7.4452C13.9395 5.85456 13.2218 4.36701 12.0444 3.29201C10.867 2.21701 9.32041 1.63734 7.72647 1.67356C6.13253 1.70978 4.61392 2.35913 3.48654 3.4865C2.35916 4.61388 1.70982 6.13249 1.6736 7.72643C1.63737 9.32037 2.21705 10.8669 3.29205 12.0444C4.36705 13.2218 5.85459 13.9394 7.44524 14.048C9.03589 14.1566 10.6072 13.6478 11.8322 12.6274L15.3521 16.148C15.4043 16.2002 15.4664 16.2417 15.5347 16.27C15.6029 16.2983 15.6761 16.3128 15.75 16.3128C15.8239 16.3128 15.8971 16.2983 15.9654 16.27C16.0337 16.2417 16.0957 16.2002 16.148 16.148C16.2003 16.0957 16.2417 16.0337 16.27 15.9654C16.2983 15.8971 16.3129 15.8239 16.3129 15.75C16.3129 15.6761 16.2983 15.6029 16.27 15.5346C16.2417 15.4663 16.2003 15.4043 16.148 15.352ZM2.81254 7.875C2.81254 6.87373 3.10945 5.89495 3.66572 5.06243C4.222 4.2299 5.01265 3.58103 5.9377 3.19786C6.86275 2.81469 7.88065 2.71444 8.86268 2.90977C9.84471 3.10511 10.7468 3.58727 11.4548 4.29527C12.1628 5.00328 12.6449 5.90533 12.8403 6.88736C13.0356 7.86938 12.9353 8.88728 12.5522 9.81234C12.169 10.7374 11.5201 11.528 10.6876 12.0843C9.85509 12.6406 8.87631 12.9375 7.87504 12.9375C6.53284 12.936 5.24603 12.4022 4.29695 11.4531C3.34787 10.504 2.81403 9.2172 2.81254 7.875Z"
              fill="white"
              fillOpacity="0.6"
            />
          </svg>
          <form onSubmit={onSearch} className="flex-1">
            <input
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);

                setResults(null);
                setSortedResults(null);
              }}
              required
              className="w-full mx-4 bg-transparent outline-none text-white"
              type="search"
              autoFocus
              placeholder="Search for files, folders, code snippets, etc..."
            />
          </form>
          <svg
            onClick={() => setShowFilterForm(!showFilterForm)}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="opacity-50 hover:opacity-100 cursor-pointer transition-all"
          >
            <path
              fill="white"
              d="M14 12v7.88c.04.3-.06.62-.29.83a.996.996 0 0 1-1.41 0l-2.01-2.01a.989.989 0 0 1-.29-.83V12h-.03L4.21 4.62a1 1 0 0 1 .17-1.4c.19-.14.4-.22.62-.22h14c.22 0 .43.08.62.22a1 1 0 0 1 .17 1.4L14.03 12H14Z"
            />
          </svg>
        </div>
        <div
          className="filters p-4 animate__animated animate__fadeIn"
          style={{
            display: showFilterForm ? 'block' : 'none',
          }}
        >
          <p className="text-xs">Search Options</p>
          <div className="options mt-4">
            <div className="option flex items-center flex-col">
              <div className="flex justify-between w-full">
                <p className="text-sm opacity-80 font-light">Include Files In Results</p>
                <input
                  checked={searchOptions.files}
                  onChange={(e) => {
                    setSearchOptions({
                      ...searchOptions,
                      directories:
                        searchOptions.directories === false && !e.target.checked ? true : searchOptions.directories,
                      files: e.target.checked,
                    });
                  }}
                  className="mr-2"
                  type="checkbox"
                  name="files"
                  id="files"
                />
              </div>
              <div className="flex justify-between w-full mt-4">
                <p className="text-sm opacity-80 font-light">Include Directories In Results</p>
                <input
                  checked={searchOptions.directories}
                  onChange={(e) => {
                    setSearchOptions({
                      ...searchOptions,
                      files: searchOptions.files === false && !e.target.checked ? true : searchOptions.files,
                      directories: e.target.checked,
                    });
                  }}
                  className="mr-2"
                  type="checkbox"
                  name="directories"
                  id="directories"
                />
              </div>
              <div className="flex justify-between w-full mt-4">
                <p className="text-sm opacity-80 font-light">Sort By</p>

                <Select
                  value={
                    sortBy === 'Name'
                      ? { value: 'Name', label: 'Name' }
                      : sortBy === 'Date'
                      ? { value: 'Date', label: 'Date' }
                      : sortBy === 'Size'
                      ? { value: 'Size', label: 'Size' }
                      : { value: 'Relevance', label: 'Relevance' }
                  }
                  styles={{
                    option: (styles) => ({
                      ...styles,
                      color: '#FFFFFF',
                      backgroundColor: '#1C1B20',
                      '&:hover': {
                        backgroundColor: '#27272D',
                      },
                      fontSize: '12px',
                    }),
                    container: (styles) => ({
                      ...styles,
                      width: '200px',
                      backgroundColor: '#1C1B20',
                      fontSize: '12px',
                    }),
                    control: (styles) => ({
                      ...styles,
                      backgroundColor: '#1C1B20',
                      borderColor: '#27272D',
                    }),
                    singleValue: (styles) => ({
                      ...styles,
                      color: '#FFFFFF',
                    }),
                    menu: (styles) => ({
                      ...styles,
                      backgroundColor: '#1C1B20',
                    }),
                  }}
                  options={[
                    { value: 'Name', label: 'Name' },
                    {
                      value: 'Date',
                      label: 'Date',
                    },
                    { value: 'Size', label: 'Size' },
                    { value: 'Relevance', label: 'Relevance' },
                  ]}
                  onChange={(e) => {
                    setSortBy(e?.value as any);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="results p-4">
          <div className="recent">
            <p className="text-xs">
              <span className="opacity-50">Recent Searches - </span> {recentSearches.length}
            </p>
            <div className="searches w-full overflow-x-auto flex items-center mt-3 pb-4">
              {recentSearches.map((search, key) => (
                <div key={key} className="bg-body p-2 mr-2 flex items-center rounded-md cursor-pointer  transition-all">
                  <p
                    onClick={() => {
                      setSearchValue(search);
                      onSearch(undefined, search);
                      setResults(null);
                      setSortedResults(null);
                    }}
                    className="text-sm mr-2 hover:underline transition-all"
                  >
                    {search}
                  </p>
                  <svg
                    onClick={() => {
                      deleteRecentSearch(key);
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                    className="opacity-50 hover:opacity-100 transition-all cursor-pointer"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="white"
                      d="M7 21q-.825 0-1.413-.588T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.588 1.413T17 21H7Zm2-4h2V8H9v9Zm4 0h2V8h-2v9Z"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </div>
          {searching && (
            <div className="m-auto w-full flex items-center justify-center">
              <InfinitySpin color="white" />
            </div>
          )}
          {sortedResults && sortedResults.results.length > 0 && (
            <>
              <p className="text-xs mt-2">
                <span className="opacity-50">Results</span> {sortedResults.results.length}
              </p>
              {results && results.more && (
                <p className="text-xs mt-2 mb-4">
                  <span className="opacity-50">
                    There are more results matching your search. Please refine your search to get more specific results.
                  </span>
                </p>
              )}
              <div className="result-list max-h-[500px] overflow-y-auto overflow-x-hidden">
                {sortedResults.results.map((result, key) => (
                  <div
                    onClick={() => clickedSearch(result)}
                    key={key}
                    className="font-light py-1 mb-1 flex items-center justify-between w-full cursor-pointer opacity-50 hover:ml-2 hover:opacity-100 transition-all"
                  >
                    <>
                      {result['Directory'] ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                          <path
                            fill="white"
                            d="M4 20q-.825 0-1.413-.588T2 18V6q0-.825.588-1.413T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.588 1.413T20 20H4Z"
                          />
                        </svg>
                      ) : (
                        <SmartFileIcon file={result} />
                      )}
                      <p className="w-1/2">{result['Directory'] ? result['Directory']![0] : result['File']![0]}</p>
                    </>
                    <p className="w-1/2 flex items-center justify-end mr-2">
                      {result['Directory']
                        ? removeLastCharOf(formatLongText(result['Directory']![1], 45))
                        : removeLastCharOf(formatLongText(result['File']![1], 45))}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          {results && results.results.length === 0 && (
            <p className="text-xs mt-2">
              <span className="opacity-50">No results found</span>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
