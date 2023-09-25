import { invoke } from '@tauri-apps/api';
import axios from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import { Item, Menu, Separator, Submenu } from 'react-contexify';
import { toast } from 'react-hot-toast';
import { ThreeCircles, Triangle } from 'react-loader-spinner';
import ReactModal from 'react-modal';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useRecoilState } from 'recoil';

import { NPM_API_URL } from '../lib/constants';
import DirectoryEmitter from '../lib/emitters/directory.emitter';
import TagsEmitter from '../lib/emitters/tags.emitter';
import { currentContextState } from '../lib/state/currentContext.state';
import { pasteboardState } from '../lib/state/pasteboard.state';
import { runtimeState } from '../lib/state/runtime.state';
import { stateCacheState } from '../lib/state/stateCache.state';
import {
  DirectoryContents,
  GitMeta,
  NPMPackageResult,
  NPMPackageResults,
  ProfileStore,
  ProjectMetadata,
  ProjectType,
  TagDoc,
} from '../lib/types';
import { formatBytes } from '../lib/utils/formatBytes';
import { generateUUID } from '../lib/utils/generateUUID';
import { NoInternetFeature } from './NoInternetFeature';

export const ContextMenu = () => {
  const [cache, setCache] = useRecoilState(stateCacheState);
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [currentContext, setCurrentContext] = useRecoilState(currentContextState);
  const [preview, setPreview] = useState({ value: '', loading: true });
  const [gitMeta, setGitMeta] = useState<GitMeta | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [show, setShow] = useState(false);
  const [commitItem, setCommitItem] = useState<DirectoryContents | null>(null);
  const [projectManagerItemTemp, setProjectManagerItemTemp] = useState<DirectoryContents | null>(null);
  const [tags, setTags] = useState<TagDoc[]>([]);
  const [pasteboard, setPasteboard] = useRecoilState(pasteboardState);
  const [isHidden, setIsHidden] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [curProject, setCurProject] = useState<ProjectMetadata | null>(null);
  const [showProjectWindow, setShowProjectWindow] = useState(false);
  const [packageResults, setPackageResults] = useState<NPMPackageResults | null>(null);
  const [packageLoading, setPackageLoading] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [installing, setInstalling] = useState(false);
  const [hasBash, setHasBash] = useState<boolean>(false);

  const onDelete = async () => {
    if (currentContext.currentItem) {
      const item = currentContext.currentItem;

      const confirmed = await confirm(
        'Are you sure you want to delete ' + (item['Directory'] ? item['Directory']![0] : item['File']![0]) + '?',
      );

      if (!confirmed) {
        toast.error('Deletion cancelled.');
        return;
      }

      toast.promise(
        invoke('delete_file', {
          path: item['Directory'] ? item['Directory']![1] : item['File']![1],
          isDir: item['Directory'] ? true : false,
          mountPoint: runtime.currentDrive?.mount_point,
        })
          .then((res) => {
            DirectoryEmitter.emit('delete', {});

            setCurrentContext({
              ...currentContext,
              currentItem: null,
            });
          })
          .catch((err) => {
            console.error(err);
          }),
        {
          error: 'Failed to delete ' + (item['Directory'] ? item['Directory']![0] : item['File']![0]),
          loading: 'Deleting ' + (item['Directory'] ? item['Directory']![0] : item['File']![0]),
          success: 'Deleted ' + (item['Directory'] ? item['Directory']![0] : item['File']![0]),
        },
        {
          duration: 3000,
        },
      );
    }
  };

  const onUninstallDep = (dep: string) => {
    if (!projectManagerItemTemp) return;

    setPackageLoading(true);

    invoke('remove_dep', {
      path: projectManagerItemTemp.Directory![1],
      projectType: curProject?.project_type,
      packageName: dep,
    })
      .then((res) => {
        toast.success(
          <>
            <p>
              Uninstalled <span className="font-mono text-green-500">{dep}</span>
            </p>
          </>,
        );

        if (projectManagerItemTemp?.Directory && projectManagerItemTemp.Directory[6]) {
          invoke<ProjectMetadata>('get_supported_project_metadata', { path: projectManagerItemTemp['Directory']![1] })
            .then((res) => {
              setPackageLoading(false);

              setCurProject(res);
              console.log(res);
              setPackageResults(null);
            })
            .catch((err) => {
              console.error(err);
              setCurProject(null);
            });
        } else {
          setPackageLoading(false);

          setCurProject(null);
        }
      })
      .catch((err) => {
        console.error(err);
        setPackageLoading(false);

        toast.error(
          <>
            <p>
              Failed to uninstall <span className="font-mono text-yellow-500">{dep}</span>
            </p>
          </>,
        );
      });
  };

  const onIntallDep = (dep: string, asDev?: boolean) => {
    if (!projectManagerItemTemp) return;

    setInstalling(true);
    setPackageLoading(true);

    invoke('install_dep', {
      path: projectManagerItemTemp.Directory![1],
      projectType: curProject?.project_type,
      packageName: dep,
      asDev: asDev,
    })
      .then((res) => {
        toast.success(
          <>
            <p>
              Installed <span className="font-mono text-green-500">{dep}</span>
            </p>
          </>,
        );

        if (projectManagerItemTemp?.Directory && projectManagerItemTemp.Directory[6]) {
          invoke<ProjectMetadata>('get_supported_project_metadata', { path: projectManagerItemTemp['Directory']![1] })
            .then((res) => {
              setInstalling(false);
              setPackageLoading(false);

              setCurProject(res);
              console.log(res);
              setPackageResults(null);
            })
            .catch((err) => {
              console.error(err);
              setCurProject(null);
            });
        } else {
          setInstalling(false);
          setPackageLoading(false);

          setCurProject(null);
        }
      })
      .catch((err) => {
        console.error(err);
        setInstalling(false);
        setPackageLoading(false);

        toast.error(
          <>
            <p>
              Failed to install <span className="font-mono text-yellow-500">{dep}</span>
            </p>
          </>,
        );
      });
  };

  useEffect(() => {
    if (!showProjectWindow) {
      setCurProject(null);
    }

    const item = currentContext.currentItem;

    if (!item) return;

    invoke<boolean>('check_bash_install').then((res) => {
      setHasBash(res);
    });

    setPackageResults(null);
    setPackageLoading(false);
    setSearchVal('');

    if (item?.Directory && item.Directory[6]) {
      invoke<ProjectMetadata>('get_supported_project_metadata', { path: item['Directory']![1] })
        .then((res) => {
          setCurProject(res);
          console.log(res);
        })
        .catch((err) => {
          console.error(err);
          setCurProject(null);
        });
    } else {
      setCurProject(null);
    }

    checkHidden();

    if (item['File'] && item['File'][1]) {
      invoke<boolean>('is_file_encrypted', { filePath: item['File']![1] })
        .then((res) => {
          setIsEncrypted(res);
        })
        .catch((err) => {
          setIsEncrypted(false);
        });
    }

    setPreview({ value: '', loading: true });

    invoke('get_file_preview', { path: item['Directory'] ? item['Directory']![1] : item['File']![1] })
      .then((res) => {
        setPreview({ value: String(res), loading: false });

        if (item['Directory'] && item['Directory']![5] === true) {
          invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] })
            .then((res) => {
              setGitMeta(res);
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);

        if (item['Directory']) {
          invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
            setGitMeta(res);
            setPreview({ value: '', loading: false });
          });
        } else {
          setGitMeta(null);
          setPreview({ value: '', loading: false });
        }
      });
  }, [currentContext]);

  const onInit = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
        if (res.can_init) {
          invoke('init_git_repo_in_directory', { path: item['Directory']![1] })
            .then((res) => {
              console.log(res);

              invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
                setGitMeta(res);
              });
            })
            .catch((err) => {
              console.log(err);
            });
        }
      });
    }
  };

  const checkHidden = async () => {
    setIsHidden(false);

    await runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then((db) => {
      if (db) {
        let hiddenFiles = db.hiddenFolders ? db.hiddenFolders : [];

        if (hiddenFiles.length < 1) return;

        let found = hiddenFiles.find(
          (doc) =>
            doc.file_path ===
            (currentContext.currentItem?.File
              ? currentContext.currentItem?.File!['0']
              : currentContext.currentItem?.Directory!['0']),
        );

        setIsHidden(found ? true : false);
      } else {
        setIsHidden(false);
      }
    });
  };

  const onCopy = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    setPasteboard({
      currentOperation: 'COPY',
      file: item,
      mountPoint: runtime.currentDrive?.mount_point!,
    });

    toast.success('Copied ' + (item.File ? item.File[0] : item.Directory![0]) + ' to clipboard.');
  };

  const onPaste = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (pasteboard.currentOperation === 'COPY') {
      if (pasteboard.file && pasteboard.file['File']) {
        invoke('paste_file_at', {
          from: pasteboard.file?.File![1],
          destination: runtime.currentDrive?.mount_point + runtime.currentPath + pasteboard.file?.File![0],
        })
          .then(() => {
            DirectoryEmitter.emit('delete', {});

            toast.success('Pasted ' + pasteboard.file?.File![0]);
          })
          .catch((err) => {
            console.error(err);
            toast.error('Failed to paste ' + pasteboard.file?.File![0]);
          });
      } else if (pasteboard.file && pasteboard.file['Directory']) {
        invoke('paste_directory_at', {
          from: pasteboard.file?.Directory![1],
          destination: runtime.currentDrive?.mount_point + runtime.currentPath + pasteboard.file?.Directory![0],
        })
          .then(() => {
            toast.success('Pasted ' + pasteboard.file?.Directory![0]);
            DirectoryEmitter.emit('delete', {});
          })
          .catch((err) => {
            console.error(err);
            toast.error('Failed to paste ' + pasteboard.file?.Directory![0]);
          });
      }
    } else if (pasteboard.currentOperation === 'CUT') {
      invoke('cut_file_from', {
        from: pasteboard.file?.File![1],
        destination: runtime.currentDrive?.mount_point + runtime.currentPath + pasteboard.file?.File![0],
      })
        .then(() => {
          DirectoryEmitter.emit('delete', {});

          toast.success('Cut ' + pasteboard.file?.File![0]);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to cut ' + pasteboard.file?.File![0]);
        });
    } else if (pasteboard.file && pasteboard.file['Directory']) {
      invoke('cut_directory_from', {
        from: pasteboard.file?.Directory![1],
        destination: runtime.currentDrive?.mount_point + runtime.currentPath + pasteboard.file?.Directory![0],
      })
        .then(() => {
          toast.success('Cut ' + pasteboard.file?.Directory![0]);
          DirectoryEmitter.emit('delete', {});
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to cut ' + pasteboard.file?.Directory![0]);
        });
    }
  };

  const onCut = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    setPasteboard({
      currentOperation: 'CUT',
      file: item,
      mountPoint: runtime.currentDrive?.mount_point!,
    });
  };

  const onDuplicate = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item && item['File']) {
      invoke('paste_file_at', {
        from: item.File![1],
        destination: runtime.currentDrive?.mount_point + runtime.currentPath + item.File![0],
      })
        .then(() => {
          toast.success('Duplicated ' + item.File![0]);

          DirectoryEmitter.emit('delete', {});
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to duplicate ' + item.File![0]);
        });
    } else if (item && item['Directory']) {
      invoke('paste_directory_at', {
        from: item?.Directory![1],
        destination: runtime.currentDrive?.mount_point + runtime.currentPath + item?.Directory![0],
      })
        .then(() => {
          toast.success('Duplicated ' + item?.Directory![0]);
          DirectoryEmitter.emit('delete', {});
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to duplicate ' + item?.Directory![0]);
        });
    }
  };

  const handleUnHide = async () => {
    const item = currentContext.currentItem;

    if (!item) return;

    await runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        let hiddenFldrs = db.hiddenFolders ? db.hiddenFolders : [];

        if (hiddenFldrs.length < 1) return;

        hiddenFldrs = hiddenFldrs.filter(
          (doc) =>
            doc.file_path !==
            (currentContext.currentItem?.File
              ? currentContext.currentItem?.File!['0']
              : currentContext.currentItem?.Directory!['0']),
        );

        await runtime.store.set(`profile-store-${runtime.currentUser}`, {
          ...db,
          hiddenFolders: hiddenFldrs,
        });

        await runtime.store.save();
      }
    });
  };

  const calcFolderSize = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke<number>('get_folder_size', { path: item['Directory']![1] })
        .then((res) => {
          const newSizes = { ...cache.folderSizes };

          newSizes[item['Directory']![1] as any] = { size: res };

          console.log(newSizes);

          setCache({
            folderSizes: newSizes,
          });

          toast.success('Folder size: ' + formatBytes(res));
        })
        .catch((err: string) => {
          if (err.includes('Access is denied')) {
            toast.error('Access is denied.');
          }
        });
    }
  };

  const handleHide = async () => {
    const item = currentContext.currentItem;

    if (!item) return;

    await runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        let hiddenFldrs = db.hiddenFolders ? db.hiddenFolders : [];

        if (item.File) {
          hiddenFldrs.push({
            uuid: generateUUID(),
            file_path: item.File!['1'].replace(runtime.currentDrive?.mount_point!, ''),
            identifier: runtime.currentPath,
            mount_point: runtime.currentDrive?.mount_point,
          });
        } else {
          hiddenFldrs.push({
            uuid: generateUUID(),
            file_path: item.Directory!['1'].replace(runtime.currentDrive?.mount_point!, ''),
            identifier: runtime.currentPath,
            mount_point: runtime.currentDrive?.mount_point,
          });
        }

        await runtime.store.set(`profile-store-${runtime.currentUser}`, {
          ...db,
          hiddenFolders: hiddenFldrs,
        });

        await runtime.store.save();

        DirectoryEmitter.emit('delete', {});
      } else {
        await runtime.store.set(`profile-store-${runtime.currentUser}`, {
          hiddenFolders: [
            {
              uuid: generateUUID(),
              file_path: item.File
                ? item.File!['1'].replace(runtime.currentDrive?.mount_point!, '')
                : item.Directory!['1'].replace(runtime.currentDrive?.mount_point!, ''),
              identifier: runtime.currentPath,
              mount_point: runtime.currentDrive?.mount_point,
            },
          ],
        });

        await runtime.store.save();

        DirectoryEmitter.emit('delete', {});
      }
    });
  };

  const onFetch = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke('fetch_repo_for_directory', { path: item['Directory']![1] })
        .then(() => {
          toast.success('Fetched changes for ' + item['Directory']![0] + '.');
        })
        .catch((err) => {
          console.log(err);

          if (String(err).includes("remote 'origin' does not exist")) {
            toast.error(
              'Remote origin does not exist for this repository. You may need to initialize it with your remote provider first. (i.e. GitHub)',
            );
            return;
          } else if (String(err).includes('401')) {
            toast.error(
              'You are not authorized to fetch this repository. Please check your credentials and try again.',
            );
            return;
          }
        });
    }
  };

  const handleDepsSearch = (e: FormEvent) => {
    e.preventDefault();

    setPackageLoading(true);

    axios.get<NPMPackageResults>(NPM_API_URL + '/search?q=' + encodeURIComponent(searchVal)).then((res) => {
      setPackageResults({
        ...res.data,
        results: res.data.results.filter((doc) => {
          if (!curProject) return true;

          let found = Object.entries(curProject.dependencies).find(([dependency]) => dependency === doc.package.name);

          return !found;
        }),
      });
      setPackageLoading(false);
    });
  };

  const onStash = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
        if (res.can_stash) {
          invoke('stash_changes_for_directory', { path: item['Directory']![1] })
            .then(() => {
              toast.success('Stashed changes for ' + item['Directory']![0] + '.');

              invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
                setGitMeta(res);
              });
            })
            .catch((err) => {
              if (String(err).includes('cannot stash changes')) {
                toast.error('Cannot stash changes or no changes to stash.');
                return;
              }
            });
        }
      });
    }
  };

  const onPull = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
        if (res.can_stash) {
          invoke('pull_changes_for_directory', { path: item['Directory']![1] })
            .then(() => {
              toast.success('Pulled changes for ' + item['Directory']![0] + '.');

              invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
                setGitMeta(res);
              });
            })
            .catch((err) => {
              console.log(err);
              toast.error('Cannot pull changes.');
            });
        }
      });
    }
  };

  const handleUnzip = async () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['File']) {
      invoke('extract_archive', { path: item['File']![1] })
        .then((res) => {
          console.log(res);
          toast.success('Extracted ' + item['File']![0] + '.');

          DirectoryEmitter.emit('refresh', {});
        })
        .catch((err) => {
          console.log(err);
          toast.error('Failed to extract ' + item['File']![0] + '.');
        });
    }
  };

  const handleArchive = async () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke('archive_folder', { path: item['Directory']![1] })
        .then((res) => {
          console.log(res);
          toast.success('Archived ' + item['Directory']![0] + '.');

          DirectoryEmitter.emit('refresh', {});
        })
        .catch((err) => {
          console.log(err);
          toast.error('Failed to archive ' + item['Directory']![0] + '.');
        });
    }
  };

  const onPush = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
        if (res.can_stash) {
          invoke('push_changes_for_directory', { path: item['Directory']![1] })
            .then(() => {
              toast.success('pushed changes for ' + item['Directory']![0] + '.');

              invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
                setGitMeta(res);
              });
            })
            .catch(() => {
              toast.error('Cannot push changes.');
            });
        }
      });
    }
  };

  const onCheckout = (branch: string) => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
        if (res.can_stash) {
          invoke('checkout_branch_for_directory', { path: item['Directory']![1], branch })
            .then((res) => {
              toast.success(`Checked out branch ${branch} for ` + item['Directory']![0] + '.' + res);

              invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
                setGitMeta(res);
              });
            })
            .catch(() => {
              toast.error('Cannot checkout branch.');
            });
        }
      });
    }
  };

  const onCommit = () => {
    const item = commitItem;

    if (!item) return;

    if (item['Directory']) {
      invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
        invoke('commit_changes_for_directory', { path: item['Directory']![1], message: commitMessage })
          .then((res) => {
            toast.success(`Made a commit in ` + item['Directory']![0] + '.' + res);

            setCommitItem(null);

            invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
              setGitMeta(res);
            });
          })
          .catch(() => {
            setCommitItem(null);

            toast.error('Cannot commit changes.');
          });
      });
    }
  };

  const addAllChanges = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (item['Directory']) {
      invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
        invoke('add_all_changes', { path: item['Directory']![1] })
          .then((res) => {
            toast.success(`Added all changes in ` + item['Directory']![0] + '.' + res);

            invoke<GitMeta>('get_git_meta_for_directory', { path: item['Directory']![1] }).then((res) => {
              setGitMeta(res);
            });
          })
          .catch(() => {
            toast.error('Cannot add changes.');
          });
      });
    }
  };

  const removeTag = async (tag: TagDoc, item: DirectoryContents) => {
    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        const updated_tag = { ...tag };

        updated_tag.file_paths = updated_tag.file_paths.filter((doc) => doc.mount_point + doc.path !== item.File!['1']);

        const tags = db.tags ? db.tags : [];

        const index = tags.findIndex((doc) => doc.uuid === tag.uuid);

        tags[index] = updated_tag;

        await runtime.store.set(`profile-store-${runtime.currentUser}`, {
          ...db,
          tags,
        });

        console.log(tags);

        setTags(tags);

        await runtime.store.save();

        toast.success(`Removed ${item['File']![0]} from ${tag.identifier} tag group.`);
      }
    });
  };

  const addTag = async (tag: TagDoc, item: DirectoryContents) => {
    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
      if (db) {
        const updated_tag = { ...tag };

        updated_tag.file_paths.push({
          mount_point: runtime.currentDrive?.mount_point,
          path: item.File!['1'].replace(runtime.currentDrive?.mount_point!, ''),
        });

        const tags = db.tags ? db.tags : [];

        const index = tags.findIndex((doc) => doc.uuid === tag.uuid);

        tags[index] = updated_tag;

        await runtime.store.set(`profile-store-${runtime.currentUser}`, {
          ...db,
          tags,
        });

        setTags(tags);

        await runtime.store.save();

        toast.success(`Added ${item['File']![0]} to ${tag.identifier} tag group.`);
      }
    });
  };

  useEffect(() => {
    runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then((db) => {
      if (db) {
        setTags(db.tags ?? []);
      } else {
        setTags([]);
      }
    });

    TagsEmitter.on('change', () => {
      runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then((db) => {
        if (db) {
          setTags(db.tags);
        } else {
          setTags([]);
        }
      });
    });

    return () => {
      TagsEmitter.off('change', () => {});
    };
  }, []);

  const handleEncrypt = async () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (!isEncrypted) {
      invoke('encrypt_file', {
        sourceFilePath: item['File']![1],
        key: import.meta.env.VITE_ENCRYPTOR_KEY.trim(),
        iv: import.meta.env.VITE_ENCRYPTOR_IV.trim(),
      })
        .then((res) => {
          toast.success('Encrypted ' + item['File']![0]);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to encrypt ' + item['File']![0]);
        });
    } else {
      invoke('decrypt_file', {
        sourceFilePath: item['File']![1],
        key: import.meta.env.VITE_ENCRYPTOR_KEY.trim(),
        iv: import.meta.env.VITE_ENCRYPTOR_IV.trim(),
      })
        .then((res) => {
          toast.success('Decrypted ' + item['File']![0]);
        })
        .catch((err) => {
          toast.error('Failed to decrypt ' + item['File']![0]);
        });
    }
  };

  const handleOpenExplorer = () => {
    const item = currentContext.currentItem;

    if (!item) return;

    invoke('open_with_explorer', { path: item.File ? item.File[1] : item.Directory![1] })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const onOpen = async () => {
    const item = currentContext.currentItem;

    if (!item) return;

    if (!item['File']) return;

    invoke('open_file', {
      path: item['File']![1],
    })
      .then((_) => {})
      .catch((err) => {
        toast.error(err);
      });
  };

  return (
    <>
      <Menu
        id="FOLDER_ITEM_MENU"
        theme="dark"
        animation="slide"
        onVisibilityChange={(visible) => {
          if (!visible) {
            setCurrentContext({
              ...currentContext,
              currentItem: null,
            });
          }
        }}
        className="text-sm"
      >
        <div
          className=" pt-2 pb-2 max-w-[500px]"
          style={{
            marginLeft: '5px',
          }}
        >
          {preview.value.includes('data:') && !preview.loading && (
            <>
              <p
                className="mb-4"
                style={{
                  opacity: 'var(--light-text-opacity)',
                }}
              >
                File Preview
              </p>

              <img src={preview.value} className="w-full rounded-lg shadow-lg mb-4 m-auto" />
            </>
          )}
          {!preview.value.includes('data:') && !preview.loading && preview.value.length > 0 && (
            <>
              <p
                className="mb-4"
                style={{
                  opacity: 'var(--light-text-opacity)',
                }}
              >
                File Preview
              </p>
              <p className="text-sm mb-4">{preview.value}...</p>
            </>
          )}
          {preview.loading && (
            <div className="m-auto flex justify-center items-center scale-75">
              <ThreeCircles color="white" />
            </div>
          )}
          <p
            className="text-md font-light"
            style={{
              opacity: 'var(--light-text-opacity)',
              color: 'var(--sidebar-inset-text-color)',
            }}
          >
            {currentContext.currentItem &&
              (currentContext.currentItem['File']
                ? 'File: ' + currentContext.currentItem['File'][0]
                : 'Folder: ' + currentContext.currentItem['Directory']![0])}
          </p>
        </div>
        <Separator />

        <Submenu
          label="Tags"
          disabled={() => {
            if (tags.length < 1) return true;

            if (currentContext.currentItem) {
              if (currentContext.currentItem['Directory']) {
                return true;
              }
            }

            return false;
          }}
        >
          {tags.map((tag, key) => (
            <Item
              onClick={() => {
                let found = tag.file_paths.find(
                  (doc) => doc.mount_point + doc.path === currentContext.currentItem?.File!['1'],
                );

                if (!found) {
                  addTag(tag, currentContext.currentItem!);
                } else {
                  removeTag(tag, currentContext.currentItem!);
                }
              }}
              id="tag"
              key={key}
              disabled={() => {
                if (currentContext.currentItem && currentContext.currentItem['Directory']) {
                  return true;
                }

                return false;
              }}
            >
              <div
                className="circle rounded-full w-[12px] h-[12px] mr-4"
                style={{
                  backgroundColor: tag.color_hex,
                }}
              ></div>
              <span>
                {`${
                  currentContext.currentItem &&
                  currentContext.currentItem.File &&
                  tag.file_paths.find((doc) => doc.mount_point + doc.path === currentContext.currentItem?.File!['1'])
                    ? 'Remove '
                    : ''
                }` + tag.identifier}
              </span>
            </Item>
          ))}
        </Submenu>
        <Separator />
        <Item
          id="hide"
          onClick={() => {
            if (isHidden) {
              handleUnHide();
            } else {
              handleHide();
            }
          }}
        >
          {isHidden ? 'Unhide' : 'Hide'}
        </Item>
        {currentContext.currentItem && currentContext.currentItem['Directory'] && (
          <Item
            id="calculate-fldr-size"
            onClick={() => {
              if (currentContext.currentItem) {
                if (!cache.folderSizes[currentContext.currentItem['Directory']![1] as any]) {
                  calcFolderSize();
                }
              }
            }}
          >
            <>
              {cache.folderSizes[currentContext.currentItem['Directory']![1] as any]
                ? 'Total Size: ' +
                  formatBytes(cache.folderSizes[currentContext.currentItem['Directory']![1] as any].size)
                : 'Calculate Folder Size'}
            </>
          </Item>
        )}
        <Item
          disabled={currentContext.currentItem && currentContext.currentItem['File'] ? true : false}
          id="archive"
          onClick={handleArchive}
        >
          Archive
        </Item>
        <Item
          disabled={currentContext.currentItem && currentContext.currentItem['Directory'] ? true : false}
          id="unarchive"
          onClick={handleUnzip}
        >
          Unzip Archive
        </Item>
        <Item
          onClick={() => {
            if (currentContext.currentItem && currentContext.currentItem['File']) {
              handleEncrypt();
            }
          }}
          id="encrypt"
          disabled={currentContext.currentItem && currentContext.currentItem['File'] ? false : true}
        >
          {isEncrypted ? 'Decrypt' : 'Encrypt'}
        </Item>
        <Submenu label="Open">
          <Item
            onClick={onOpen}
            id="open"
            disabled={currentContext.currentItem && currentContext.currentItem['File'] ? false : true}
          >
            Open With Default App
          </Item>
          <Item id="open-explorer" onClick={handleOpenExplorer}>
            Open In Explorer
          </Item>
          {/* <Item id="open-with" onClick={handleOpenWith}>
            Open With
          </Item> */}
        </Submenu>
        <Item
          id="copy-path"
          onClick={() => {
            if (currentContext.currentItem && currentContext.currentItem['File']) {
              navigator.clipboard.writeText(currentContext.currentItem['File']![1]);
              toast.success('Copied path to clipboard.');
            } else if (currentContext.currentItem && currentContext.currentItem['Directory']) {
              navigator.clipboard.writeText(currentContext.currentItem['Directory']![1]);
              toast.success('Copied path to clipboard.');
            }
          }}
        >
          Copy Path
        </Item>
        <Submenu label="Operations">
          <Item id="duplicate" onClick={onDuplicate}>
            Duplicate
          </Item>
          <Item id="cut" onClick={onCut}>
            Cut
          </Item>
          <Item id="copy" onClick={onCopy}>
            Copy
          </Item>
          <Item disabled={pasteboard.currentOperation === 'NONE'} id="paste" onClick={onPaste}>
            Paste {pasteboard.file?.File ? pasteboard.file.File[0] : pasteboard.file?.Directory![0]}
          </Item>
          <Item id="rename">Rename</Item>
          <Item id="delete" onClick={onDelete} color="red">
            <p className="text-error">Delete</p>
          </Item>
        </Submenu>
        <Separator />
        <Submenu
          label={
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256">
                <g fill="none">
                  <rect width="256" height="256" fill="#F03C2E" rx="60" />
                  <g clipPath="url(#skillIconsGit0)">
                    <path
                      fill="#fff"
                      d="m224.225 119.094l-87.319-87.319a12.869 12.869 0 0 0-14.035-2.793a12.869 12.869 0 0 0-4.177 2.793L100.569 49.9l23 23c5.35-1.875 11.475-.594 15.737 3.669a15.313 15.313 0 0 1 3.631 15.831l22.169 22.169c5.363-1.85 11.55-.657 15.831 3.637a15.322 15.322 0 0 1 3.321 16.706a15.333 15.333 0 0 1-20.029 8.293c-1.86-.771-3.55-1.9-4.973-3.324c-4.5-4.5-5.612-11.125-3.337-16.669l-20.675-20.675v54.407a15.605 15.605 0 0 1 4.062 2.9a15.326 15.326 0 0 1-21.675 21.675a15.318 15.318 0 0 1-3.326-16.704a15.297 15.297 0 0 1 3.326-4.971c1.481-1.475 3.125-2.594 5.019-3.344v-54.913a15.216 15.216 0 0 1-5.019-3.343a15.315 15.315 0 0 1-3.3-16.757L91.644 58.813l-59.875 59.812a12.88 12.88 0 0 0-2.795 14.04a12.88 12.88 0 0 0 2.795 4.179l87.325 87.312a12.884 12.884 0 0 0 4.177 2.793a12.888 12.888 0 0 0 9.858 0a12.884 12.884 0 0 0 4.177-2.793l86.919-86.781a12.882 12.882 0 0 0 3.776-9.109a12.876 12.876 0 0 0-3.776-9.11"
                    />
                  </g>
                  <defs>
                    <clipPath id="skillIconsGit0">
                      <path fill="#fff" d="M28 28h200v200H28z" />
                    </clipPath>
                  </defs>
                </g>
              </svg>
              <p
                className="ml-2"
                style={{
                  opacity: 'var(--light-text-opacity)',
                  color: 'var(--sidebar-inset-text-color)',
                }}
              >
                Git
              </p>
            </div>
          }
          disabled={!currentContext.currentItem?.Directory ? true : false}
        >
          <Item id="init" disabled={!gitMeta?.can_init} onClick={onInit}>
            Init
          </Item>
          <Item id="clone" disabled={!gitMeta?.can_fetch} onClick={onFetch}>
            Fetch All
          </Item>
          <Item id="pull" disabled={!gitMeta?.can_pull} onClick={onPull}>
            Pull
          </Item>
          <Separator />
          <Item id="commit" onClick={addAllChanges} disabled={!gitMeta?.can_fetch}>
            Add All Changes
          </Item>
          <Item
            id="commit"
            disabled={!gitMeta?.can_commit}
            onClick={() => {
              setCommitItem(currentContext.currentItem);
              setShow(true);
            }}
          >
            Commit Changes
          </Item>
          <Item id="push" disabled={!gitMeta?.can_push} onClick={onPush}>
            Push Changes
          </Item>
          <Item id="stash" disabled={!gitMeta?.can_stash} onClick={onStash}>
            Stash Changes
          </Item>
          {gitMeta && (
            <Submenu label="Checkout Branch" disabled={gitMeta.branches.length < 2}>
              {gitMeta &&
                gitMeta.branches.map((branch, key) => (
                  <Item
                    id="checkoutBranch"
                    key={key}
                    onClick={() => onCheckout(branch)}
                    disabled={gitMeta.current_branch === branch}
                  >
                    {branch}
                  </Item>
                ))}
            </Submenu>
          )}
        </Submenu>
        {curProject && (
          <Item
            disabled={!hasBash}
            id="select-project"
            onClick={() => {
              setProjectManagerItemTemp(currentContext.currentItem);

              setShowProjectWindow(true);
            }}
          >
            {curProject.project_type.toString() === 'NPM' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" className="mr-2" height="20" viewBox="0 0 256 256">
                <path fill="#C12127" d="M0 256V0h256v256z" />
                <path fill="#FFF" d="M48 48h160v160h-32V80h-48v128H48z" />
              </svg>
            )}
            {curProject.project_type.toString() === 'Cargo' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2" width="20" height="20" viewBox="0 0 128 128">
                <path
                  fill="white"
                  d="M62.96.242c-.232.135-1.203 1.528-2.16 3.097c-2.4 3.94-2.426 3.942-5.65.549c-2.098-2.207-2.605-2.611-3.28-2.606c-.44.002-.995.152-1.235.332c-.239.18-.916 1.612-1.504 3.183c-1.346 3.6-1.41 3.715-2.156 3.859c-.46.087-1.343-.406-3.463-1.928c-1.565-1.125-3.1-2.045-3.411-2.045c-1.291 0-1.655.706-2.27 4.4c-.78 4.697-.754 4.681-4.988 2.758c-1.71-.776-3.33-1.411-3.603-1.411c-.274 0-.792.294-1.15.653c-.652.652-.653.655-.475 4.246l.178 3.595l-.68.364c-.602.322-1.017.283-3.684-.348c-3.48-.822-4.216-.8-4.92.15l-.516.693l.692 2.964c.38 1.63.745 3.2.814 3.487c.067.287-.05.746-.26 1.02c-.348.448-.717.489-3.939.44c-5.453-.086-5.762.382-3.51 5.3c.717 1.56 1.304 2.979 1.304 3.149c0 .899-.717 1.225-3.794 1.728c-1.722.28-3.218.51-3.326.51c-.107 0-.43.235-.717.522c-.937.936-.671 1.816 1.453 4.814c2.646 3.735 2.642 3.749-1.73 5.421c-4.971 1.902-5.072 2.37-1.287 5.96c3.525 3.344 3.53 3.295-.461 5.804C.208 62.8.162 62.846.085 63.876c-.093 1.253-.071 1.275 3.538 3.48c3.57 2.18 3.57 2.246.067 5.56C-.078 76.48.038 77 5.013 78.877c4.347 1.64 4.353 1.66 1.702 5.394c-1.502 2.117-1.981 2.999-1.981 3.653c0 1.223.637 1.535 4.441 2.174c3.205.54 3.919.857 3.919 1.741c0 .182-.588 1.612-1.307 3.177c-2.236 4.87-1.981 5.275 3.311 5.275c4.929 0 4.798-.15 3.736 4.294c-.8 3.35-.813 3.992-.088 4.715c.554.556 1.6.494 4.87-.289c2.499-.596 2.937-.637 3.516-.328l.661.354l-.178 3.594c-.178 3.593-.177 3.595.475 4.248c.358.359.884.652 1.165.652c.282 0 1.903-.631 3.604-1.404c4.22-1.916 4.194-1.932 4.973 2.75c.617 3.711.977 4.4 2.294 4.4c.327 0 1.83-.88 3.34-1.958c2.654-1.893 3.342-2.19 4.049-1.74c.182.115.89 1.67 1.572 3.455c1.003 2.625 1.37 3.309 1.929 3.576c1.062.509 1.72.1 4.218-2.62c3.016-3.286 3.14-3.27 5.602.72c2.72 4.406 3.424 4.396 6.212-.089c2.402-3.864 2.374-3.862 5.621-.47c2.157 2.25 2.616 2.61 3.343 2.61c.464 0 1.019-.175 1.23-.388c.214-.213.92-1.786 1.568-3.496c.649-1.71 1.321-3.2 1.495-3.31c.687-.436 1.398-.13 4.048 1.752c1.56 1.108 3.028 1.959 3.377 1.959c1.296 0 1.764-.92 2.302-4.534c.46-3.082.554-3.378 1.16-3.685c.596-.302.954-.2 3.75 1.07c1.701.77 3.323 1.402 3.604 1.402c.282 0 .816-.302 1.184-.672l.672-.67l-.184-3.448c-.177-3.291-.16-3.468.364-3.943c.54-.488.596-.486 3.615.204c3.656.835 4.338.857 5.025.17c.671-.671.664-.818-.254-4.691c-1.03-4.345-1.168-4.19 3.78-4.19c3.374 0 3.75-.048 4.18-.522c.718-.793.547-1.702-.896-4.779c-.729-1.55-1.32-2.96-1.315-3.135c.024-.914.743-1.227 4.065-1.767c2.033-.329 3.553-.711 3.829-.96c.923-.833.584-1.918-1.523-4.873c-2.642-3.703-2.63-3.738 1.599-5.297c5.064-1.866 5.209-2.488 1.419-6.09c-3.51-3.335-3.512-3.317.333-5.677c4.648-2.853 4.655-3.496.082-6.335c-3.933-2.44-3.93-2.406-.405-5.753c3.78-3.593 3.678-4.063-1.295-5.965c-4.388-1.679-4.402-1.72-1.735-5.38c1.588-2.18 1.982-2.903 1.982-3.65c0-1.306-.586-1.598-4.436-2.22c-3.216-.52-3.924-.835-3.924-1.75c0-.174.588-1.574 1.307-3.113c1.406-3.013 1.604-4.22.808-4.94c-.428-.387-1-.443-4.067-.392c-3.208.054-3.618.008-4.063-.439c-.486-.488-.48-.557.278-3.725c.931-3.881.935-3.975.17-4.694c-.777-.73-1.262-.718-4.826.121c-2.597.612-3.027.653-3.617.337l-.67-.36l.185-3.582l.186-3.581l-.67-.67c-.369-.369-.891-.67-1.163-.67c-.27 0-1.884.64-3.583 1.422c-2.838 1.306-3.143 1.393-3.757 1.072c-.612-.32-.714-.637-1.237-3.829c-.603-3.693-.977-4.412-2.288-4.412c-.311 0-1.853.925-3.426 2.055c-2.584 1.856-2.93 2.032-3.574 1.807c-.533-.186-.843-.59-1.221-1.599c-.28-.742-.817-2.172-1.194-3.177c-.762-2.028-1.187-2.482-2.328-2.482c-.637 0-1.213.458-3.28 2.604c-3.249 3.375-3.261 3.374-5.65-.545C66.073 1.78 65.075.382 64.81.24c-.597-.321-1.3-.32-1.85.002m2.96 11.798c2.83 2.014 1.326 6.75-2.144 6.75c-3.368 0-5.064-4.057-2.659-6.36c1.357-1.3 3.303-1.459 4.804-.39m-3.558 12.507c1.855.705 2.616.282 6.852-3.8l3.182-3.07l1.347.18c4.225.56 12.627 4.25 17.455 7.666c4.436 3.14 10.332 9.534 12.845 13.93l.537.942l-2.38 5.364c-1.31 2.95-2.382 5.673-2.382 6.053c0 .878.576 2.267 1.13 2.726c.234.195 2.457 1.265 4.939 2.378l4.51 2.025l.178 1.148c.23 1.495.26 5.167.052 6.21l-.163.816h-2.575c-2.987 0-2.756-.267-2.918 3.396c-.118 2.656-.76 4.124-2.219 5.075c-2.378 1.551-6.305 1.27-7.97-.571c-.256-.283-.753-1.704-1.106-3.16c-1.03-4.253-2.413-6.64-5.193-8.964c-.878-.733-1.595-1.418-1.595-1.522c0-.102.965-.915 2.145-1.803c4.298-3.24 6.77-7.012 7.04-10.747c.519-7.126-5.158-13.767-13.602-15.92c-2.002-.51-2.857-.526-27.624-.526c-14.057 0-25.559-.092-25.559-.204c0-.263 3.124-3.295 4.964-4.816c5.054-4.178 11.618-7.465 18.417-9.221l2.35-.609l3.341 3.387c1.838 1.863 3.64 3.499 4.002 3.637M20.3 46.339c1.539 1.008 2.17 3.54 1.26 5.062c-1.405 2.356-4.966 2.455-6.373.178c-2.046-3.309 1.895-7.349 5.113-5.24m90.672.129c4.026 2.455.906 8.494-3.404 6.587c-2.877-1.273-2.97-5.206-.155-6.641c1.174-.6 2.523-.578 3.56.054m-78.81 15.031v15.02h-13.28l-.526-2.285c-1.036-4.5-1.472-9.156-1.211-12.969l.182-2.679l4.565-2.047c2.864-1.283 4.706-2.262 4.943-2.625c1.038-1.584.94-2.715-.518-5.933l-.68-1.502h6.523v15.02M70.39 47.132c2.843.74 4.345 2.245 4.349 4.355c.002 1.549-.765 2.52-2.67 3.38c-1.348.61-1.562.625-10.063.708l-8.686.084v-8.92h7.782c6.078 0 8.112.086 9.288.393m-2.934 21.554c1.41.392 3.076 1.616 3.93 2.888c.898 1.337 1.423 3.076 2.667 8.836c1.05 4.869 1.727 6.46 3.62 8.532c2.345 2.566 1.8 2.466 13.514 2.466c5.61 0 10.198.09 10.198.2c0 .197-3.863 4.764-4.03 4.764c-.048 0-2.066-.422-4.484-.939c-6.829-1.458-7.075-1.287-8.642 6.032l-1.008 4.702l-.91.448c-1.518.75-6.453 2.292-9.01 2.819c-4.228.87-8.828 1.163-12.871.822c-6.893-.585-16.02-3.259-16.377-4.8c-.075-.327-.535-2.443-1.018-4.704c-.485-2.26-1.074-4.404-1.31-4.764c-1.13-1.724-2.318-1.83-7.547-.674c-1.98.439-3.708.796-3.84.796c-.248 0-3.923-4.249-3.923-4.535c0-.09 8.728-.194 19.396-.23l19.395-.066l.07-6.89c.05-4.865-.018-6.997-.229-7.25c-.235-.284-1.486-.358-6.012-.358H53.32v-8.36l6.597.001c3.626.002 7.02.12 7.539.264M37.57 100.019c3.084 1.88 1.605 6.804-2.043 6.8c-3.74-.001-5.127-4.881-1.94-6.826c1.055-.643 2.908-.63 3.983.026m56.48.206c1.512 1.108 2.015 3.413 1.079 4.949c-2.46 4.035-8.612.828-6.557-3.418c1.01-2.085 3.695-2.837 5.478-1.531"
                />
              </svg>
            )}
            {curProject.project_type} Project Manager
          </Item>
        )}
      </Menu>
      <ReactModal
        isOpen={showProjectWindow}
        onRequestClose={() => {
          setShowProjectWindow(false);
        }}
        style={{
          content: {
            backgroundColor: 'var(--sidebar-bg)',
            border: 'none',
            padding: 0,
            width: '60%',
            maxHeight: '80%',
            overflow: 'auto',
            margin: 'auto',
            borderRadius: '8px',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <>
          {curProject && (
            <div className="p-8 animate__animated animate__fadeIn">
              <div className="flex items-center justify-between">
                <h1 className="font-mono text-yellow-500 text-lg">{curProject.name}</h1>
                <h2 className="flex items-center font-light text-sm">
                  {curProject.project_type.toString() === 'NPM' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      className="mr-2"
                      height="20"
                      viewBox="0 0 256 256"
                    >
                      <path fill="#C12127" d="M0 256V0h256v256z" />
                      <path fill="#FFF" d="M48 48h160v160h-32V80h-48v128H48z" />
                    </svg>
                  )}
                  {curProject.project_type.toString() === 'Cargo' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2"
                      width="20"
                      height="20"
                      viewBox="0 0 128 128"
                    >
                      <path
                        fill="white"
                        d="M62.96.242c-.232.135-1.203 1.528-2.16 3.097c-2.4 3.94-2.426 3.942-5.65.549c-2.098-2.207-2.605-2.611-3.28-2.606c-.44.002-.995.152-1.235.332c-.239.18-.916 1.612-1.504 3.183c-1.346 3.6-1.41 3.715-2.156 3.859c-.46.087-1.343-.406-3.463-1.928c-1.565-1.125-3.1-2.045-3.411-2.045c-1.291 0-1.655.706-2.27 4.4c-.78 4.697-.754 4.681-4.988 2.758c-1.71-.776-3.33-1.411-3.603-1.411c-.274 0-.792.294-1.15.653c-.652.652-.653.655-.475 4.246l.178 3.595l-.68.364c-.602.322-1.017.283-3.684-.348c-3.48-.822-4.216-.8-4.92.15l-.516.693l.692 2.964c.38 1.63.745 3.2.814 3.487c.067.287-.05.746-.26 1.02c-.348.448-.717.489-3.939.44c-5.453-.086-5.762.382-3.51 5.3c.717 1.56 1.304 2.979 1.304 3.149c0 .899-.717 1.225-3.794 1.728c-1.722.28-3.218.51-3.326.51c-.107 0-.43.235-.717.522c-.937.936-.671 1.816 1.453 4.814c2.646 3.735 2.642 3.749-1.73 5.421c-4.971 1.902-5.072 2.37-1.287 5.96c3.525 3.344 3.53 3.295-.461 5.804C.208 62.8.162 62.846.085 63.876c-.093 1.253-.071 1.275 3.538 3.48c3.57 2.18 3.57 2.246.067 5.56C-.078 76.48.038 77 5.013 78.877c4.347 1.64 4.353 1.66 1.702 5.394c-1.502 2.117-1.981 2.999-1.981 3.653c0 1.223.637 1.535 4.441 2.174c3.205.54 3.919.857 3.919 1.741c0 .182-.588 1.612-1.307 3.177c-2.236 4.87-1.981 5.275 3.311 5.275c4.929 0 4.798-.15 3.736 4.294c-.8 3.35-.813 3.992-.088 4.715c.554.556 1.6.494 4.87-.289c2.499-.596 2.937-.637 3.516-.328l.661.354l-.178 3.594c-.178 3.593-.177 3.595.475 4.248c.358.359.884.652 1.165.652c.282 0 1.903-.631 3.604-1.404c4.22-1.916 4.194-1.932 4.973 2.75c.617 3.711.977 4.4 2.294 4.4c.327 0 1.83-.88 3.34-1.958c2.654-1.893 3.342-2.19 4.049-1.74c.182.115.89 1.67 1.572 3.455c1.003 2.625 1.37 3.309 1.929 3.576c1.062.509 1.72.1 4.218-2.62c3.016-3.286 3.14-3.27 5.602.72c2.72 4.406 3.424 4.396 6.212-.089c2.402-3.864 2.374-3.862 5.621-.47c2.157 2.25 2.616 2.61 3.343 2.61c.464 0 1.019-.175 1.23-.388c.214-.213.92-1.786 1.568-3.496c.649-1.71 1.321-3.2 1.495-3.31c.687-.436 1.398-.13 4.048 1.752c1.56 1.108 3.028 1.959 3.377 1.959c1.296 0 1.764-.92 2.302-4.534c.46-3.082.554-3.378 1.16-3.685c.596-.302.954-.2 3.75 1.07c1.701.77 3.323 1.402 3.604 1.402c.282 0 .816-.302 1.184-.672l.672-.67l-.184-3.448c-.177-3.291-.16-3.468.364-3.943c.54-.488.596-.486 3.615.204c3.656.835 4.338.857 5.025.17c.671-.671.664-.818-.254-4.691c-1.03-4.345-1.168-4.19 3.78-4.19c3.374 0 3.75-.048 4.18-.522c.718-.793.547-1.702-.896-4.779c-.729-1.55-1.32-2.96-1.315-3.135c.024-.914.743-1.227 4.065-1.767c2.033-.329 3.553-.711 3.829-.96c.923-.833.584-1.918-1.523-4.873c-2.642-3.703-2.63-3.738 1.599-5.297c5.064-1.866 5.209-2.488 1.419-6.09c-3.51-3.335-3.512-3.317.333-5.677c4.648-2.853 4.655-3.496.082-6.335c-3.933-2.44-3.93-2.406-.405-5.753c3.78-3.593 3.678-4.063-1.295-5.965c-4.388-1.679-4.402-1.72-1.735-5.38c1.588-2.18 1.982-2.903 1.982-3.65c0-1.306-.586-1.598-4.436-2.22c-3.216-.52-3.924-.835-3.924-1.75c0-.174.588-1.574 1.307-3.113c1.406-3.013 1.604-4.22.808-4.94c-.428-.387-1-.443-4.067-.392c-3.208.054-3.618.008-4.063-.439c-.486-.488-.48-.557.278-3.725c.931-3.881.935-3.975.17-4.694c-.777-.73-1.262-.718-4.826.121c-2.597.612-3.027.653-3.617.337l-.67-.36l.185-3.582l.186-3.581l-.67-.67c-.369-.369-.891-.67-1.163-.67c-.27 0-1.884.64-3.583 1.422c-2.838 1.306-3.143 1.393-3.757 1.072c-.612-.32-.714-.637-1.237-3.829c-.603-3.693-.977-4.412-2.288-4.412c-.311 0-1.853.925-3.426 2.055c-2.584 1.856-2.93 2.032-3.574 1.807c-.533-.186-.843-.59-1.221-1.599c-.28-.742-.817-2.172-1.194-3.177c-.762-2.028-1.187-2.482-2.328-2.482c-.637 0-1.213.458-3.28 2.604c-3.249 3.375-3.261 3.374-5.65-.545C66.073 1.78 65.075.382 64.81.24c-.597-.321-1.3-.32-1.85.002m2.96 11.798c2.83 2.014 1.326 6.75-2.144 6.75c-3.368 0-5.064-4.057-2.659-6.36c1.357-1.3 3.303-1.459 4.804-.39m-3.558 12.507c1.855.705 2.616.282 6.852-3.8l3.182-3.07l1.347.18c4.225.56 12.627 4.25 17.455 7.666c4.436 3.14 10.332 9.534 12.845 13.93l.537.942l-2.38 5.364c-1.31 2.95-2.382 5.673-2.382 6.053c0 .878.576 2.267 1.13 2.726c.234.195 2.457 1.265 4.939 2.378l4.51 2.025l.178 1.148c.23 1.495.26 5.167.052 6.21l-.163.816h-2.575c-2.987 0-2.756-.267-2.918 3.396c-.118 2.656-.76 4.124-2.219 5.075c-2.378 1.551-6.305 1.27-7.97-.571c-.256-.283-.753-1.704-1.106-3.16c-1.03-4.253-2.413-6.64-5.193-8.964c-.878-.733-1.595-1.418-1.595-1.522c0-.102.965-.915 2.145-1.803c4.298-3.24 6.77-7.012 7.04-10.747c.519-7.126-5.158-13.767-13.602-15.92c-2.002-.51-2.857-.526-27.624-.526c-14.057 0-25.559-.092-25.559-.204c0-.263 3.124-3.295 4.964-4.816c5.054-4.178 11.618-7.465 18.417-9.221l2.35-.609l3.341 3.387c1.838 1.863 3.64 3.499 4.002 3.637M20.3 46.339c1.539 1.008 2.17 3.54 1.26 5.062c-1.405 2.356-4.966 2.455-6.373.178c-2.046-3.309 1.895-7.349 5.113-5.24m90.672.129c4.026 2.455.906 8.494-3.404 6.587c-2.877-1.273-2.97-5.206-.155-6.641c1.174-.6 2.523-.578 3.56.054m-78.81 15.031v15.02h-13.28l-.526-2.285c-1.036-4.5-1.472-9.156-1.211-12.969l.182-2.679l4.565-2.047c2.864-1.283 4.706-2.262 4.943-2.625c1.038-1.584.94-2.715-.518-5.933l-.68-1.502h6.523v15.02M70.39 47.132c2.843.74 4.345 2.245 4.349 4.355c.002 1.549-.765 2.52-2.67 3.38c-1.348.61-1.562.625-10.063.708l-8.686.084v-8.92h7.782c6.078 0 8.112.086 9.288.393m-2.934 21.554c1.41.392 3.076 1.616 3.93 2.888c.898 1.337 1.423 3.076 2.667 8.836c1.05 4.869 1.727 6.46 3.62 8.532c2.345 2.566 1.8 2.466 13.514 2.466c5.61 0 10.198.09 10.198.2c0 .197-3.863 4.764-4.03 4.764c-.048 0-2.066-.422-4.484-.939c-6.829-1.458-7.075-1.287-8.642 6.032l-1.008 4.702l-.91.448c-1.518.75-6.453 2.292-9.01 2.819c-4.228.87-8.828 1.163-12.871.822c-6.893-.585-16.02-3.259-16.377-4.8c-.075-.327-.535-2.443-1.018-4.704c-.485-2.26-1.074-4.404-1.31-4.764c-1.13-1.724-2.318-1.83-7.547-.674c-1.98.439-3.708.796-3.84.796c-.248 0-3.923-4.249-3.923-4.535c0-.09 8.728-.194 19.396-.23l19.395-.066l.07-6.89c.05-4.865-.018-6.997-.229-7.25c-.235-.284-1.486-.358-6.012-.358H53.32v-8.36l6.597.001c3.626.002 7.02.12 7.539.264M37.57 100.019c3.084 1.88 1.605 6.804-2.043 6.8c-3.74-.001-5.127-4.881-1.94-6.826c1.055-.643 2.908-.63 3.983.026m56.48.206c1.512 1.108 2.015 3.413 1.079 4.949c-2.46 4.035-8.612.828-6.557-3.418c1.01-2.085 3.695-2.837 5.478-1.531"
                      />
                    </svg>
                  )}
                  {curProject.project_type.toString()} Project Manager
                </h2>
              </div>
              <p className="mt-4 text-xs opacity-50">
                {Object.keys(curProject.dependencies).length} dependencies detected
              </p>
              <hr className="my-4 opacity-50" />
              <p className="opacity-50 font-medium text-sm mb-2">Project Description</p>
              {curProject.description ? (
                <p
                  className="mb-4 text-sm w-full p-2"
                  style={{
                    backgroundColor: 'var(--sidebar-inset-bg)',
                  }}
                >
                  {curProject.description}
                </p>
              ) : (
                <p
                  className="mb-4 text-sm w-full p-2 leading-loose"
                  style={{
                    backgroundColor: 'var(--sidebar-inset-bg)',
                  }}
                >
                  No description is provided.
                </p>
              )}
              <NoInternetFeature>
                {curProject.project_type.toString() === 'NPM' && (
                  <>
                    <p className="opacity-50 font-medium text-sm mb-2 mt-4">Install Packages</p>
                    <div
                      className="top border-b border-white border-opacity-10 p-3 flex items-center justify-between mb-4 rounded-lg"
                      style={{
                        backgroundColor: 'var(--sidebar-inset-bg)',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M16.148 15.352L12.6275 11.8322C13.6479 10.6071 14.1567 9.03585 14.0481 7.4452C13.9395 5.85456 13.2218 4.36701 12.0444 3.29201C10.867 2.21701 9.32041 1.63734 7.72647 1.67356C6.13253 1.70978 4.61392 2.35913 3.48654 3.4865C2.35916 4.61388 1.70982 6.13249 1.6736 7.72643C1.63737 9.32037 2.21705 10.8669 3.29205 12.0444C4.36705 13.2218 5.85459 13.9394 7.44524 14.048C9.03589 14.1566 10.6072 13.6478 11.8322 12.6274L15.3521 16.148C15.4043 16.2002 15.4664 16.2417 15.5347 16.27C15.6029 16.2983 15.6761 16.3128 15.75 16.3128C15.8239 16.3128 15.8971 16.2983 15.9654 16.27C16.0337 16.2417 16.0957 16.2002 16.148 16.148C16.2003 16.0957 16.2417 16.0337 16.27 15.9654C16.2983 15.8971 16.3129 15.8239 16.3129 15.75C16.3129 15.6761 16.2983 15.6029 16.27 15.5346C16.2417 15.4663 16.2003 15.4043 16.148 15.352ZM2.81254 7.875C2.81254 6.87373 3.10945 5.89495 3.66572 5.06243C4.222 4.2299 5.01265 3.58103 5.9377 3.19786C6.86275 2.81469 7.88065 2.71444 8.86268 2.90977C9.84471 3.10511 10.7468 3.58727 11.4548 4.29527C12.1628 5.00328 12.6449 5.90533 12.8403 6.88736C13.0356 7.86938 12.9353 8.88728 12.5522 9.81234C12.169 10.7374 11.5201 11.528 10.6876 12.0843C9.85509 12.6406 8.87631 12.9375 7.87504 12.9375C6.53284 12.936 5.24603 12.4022 4.29695 11.4531C3.34787 10.504 2.81403 9.2172 2.81254 7.875Z"
                          fill="white"
                          fillOpacity="0.6"
                        />
                      </svg>
                      <form onSubmit={handleDepsSearch} className="flex-1">
                        <input
                          value={searchVal}
                          onChange={(e) => {
                            if (packageResults && packageResults.results.length > 0) {
                              setPackageResults(null);
                            }

                            setSearchVal(e.target.value);
                          }}
                          required
                          className="w-full mx-4 bg-transparent outline-none text-white"
                          type="search"
                          autoFocus
                          placeholder="Start searching for packages, eg. @types/node"
                        />
                      </form>
                    </div>
                  </>
                )}
              </NoInternetFeature>
              {packageLoading && curProject.project_type.toString() === 'NPM' && (
                <div className="flex items-center justify-center my-12">
                  <Triangle height="80" width="80" color="var(--icon-color)" />
                  {installing && <p>Installing Package...</p>}
                </div>
              )}
              {!packageLoading && packageResults && curProject.project_type.toString() === 'NPM' && (
                <div
                  className="pckg-results animate__animated animate__fadeIn max-h-[300px] overflow-auto p-2 rounded-md border border-opacity-20 border-white"
                  style={{
                    backgroundColor: 'var(--sidebar-inset-bg)',
                  }}
                >
                  {packageResults.results.length > 0 ? (
                    <>
                      {packageResults.results.map((result, key) => (
                        <div
                          key={key}
                          className="flex items-center mb-4 p-2 shadow-lg"
                          style={{
                            backgroundColor: 'var(--sidebar-bg)',
                          }}
                        >
                          <div className="flex flex-col">
                            <p className="font-mono mb-3 flex items-center">
                              {result.package.name}
                              <Link
                                className="hover:opacity-50 transition-all duration-200"
                                to={
                                  curProject.project_type.toString() === 'NPM'
                                    ? `https://www.npmjs.com/package/${result.package.name}`
                                    : `https://crates.io/crates/${name}`
                                }
                                target="_blank"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 50 50">
                                  <path
                                    fill="var(--icon-color)"
                                    d="m38.288 10.297l1.414 1.415l-14.99 14.99l-1.414-1.414z"
                                  />
                                  <path
                                    fill="var(--icon-color)"
                                    d="M40 20h-2v-8h-8v-2h10zm-5 18H15c-1.7 0-3-1.3-3-3V15c0-1.7 1.3-3 3-3h11v2H15c-.6 0-1 .4-1 1v20c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V24h2v11c0 1.7-1.3 3-3 3z"
                                  />
                                </svg>
                              </Link>
                            </p>
                            <div className="scores flex items-center">
                              {result.flags && result.flags.unstable && (
                                <p className="text-xs font-mono mr-3 bg-yellow-600 text-white p-1 rounded-md">
                                  Unstable
                                </p>
                              )}
                              <p className="text-xs font-mono mr-3">{result.package.version}</p>
                              <div
                                className="flex items-center opacity-80 text-sm cursor-pointer mr-3"
                                data-tooltip-id="tooltip-popularity"
                              >
                                <svg
                                  className="mr-1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 512 512"
                                >
                                  <path
                                    fill="white"
                                    d="M414.39 97.61A224 224 0 1 0 97.61 414.39A224 224 0 1 0 414.39 97.61ZM184 208a24 24 0 1 1-24 24a23.94 23.94 0 0 1 24-24Zm167.67 106.17c-12 40.3-50.2 69.83-95.62 69.83s-83.62-29.53-95.72-69.83a8 8 0 0 1 7.83-10.17h175.69a8 8 0 0 1 7.82 10.17ZM328 256a24 24 0 1 1 24-24a23.94 23.94 0 0 1-24 24Z"
                                  />
                                </svg>
                                <p
                                  className={`${
                                    result.score.detail.popularity * 100 < 40
                                      ? 'text-red-500'
                                      : result.score.detail.popularity * 100 > 40 &&
                                        result.score.detail.popularity * 100 < 60
                                      ? 'text-yellow-500'
                                      : 'text-green-500'
                                  }`}
                                >
                                  {(result.score.detail.popularity * 100).toFixed()}%
                                </p>
                              </div>
                              <div
                                className="flex items-center opacity-80 text-sm cursor-pointer mr-3"
                                data-tooltip-id="tooltip-quality"
                              >
                                <svg
                                  className="mr-1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    fill="white"
                                    d="m19 1l-1.26 2.75L15 5l2.74 1.26L19 9l1.25-2.74L23 5l-2.75-1.25M9 4L6.5 9.5L1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5M19 15l-1.26 2.74L15 19l2.74 1.25L19 23l1.25-2.75L23 19l-2.75-1.26"
                                  />
                                </svg>
                                <p
                                  className={`${
                                    result.score.detail.quality * 100 < 40
                                      ? 'text-red-500'
                                      : result.score.detail.quality * 100 > 40 && result.score.detail.quality * 100 < 60
                                      ? 'text-yellow-500'
                                      : 'text-green-500'
                                  }`}
                                >
                                  {(result.score.detail.quality * 100).toFixed()}%
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-end justify-end flex-1">
                            <button
                              onClick={() => {
                                onIntallDep(result.package.name, false);
                              }}
                              className="bg-green-600 text-sm p-2 rounded-md hover:opacity-50 transition-all duration-200"
                            >
                              Install
                            </button>
                            <button
                              onClick={() => {
                                onIntallDep(result.package.name, true);
                              }}
                              className="bg-green-600 text-sm p-2 rounded-md ml-3 hover:opacity-50 transition-all duration-200"
                            >
                              Install Dev Dependency
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p>No results found.</p>
                  )}
                </div>
              )}
              <p className="opacity-50 font-medium text-sm mb-2 mt-4">Project Dependencies</p>
              <div className="deps">
                {Object.entries(curProject.dependencies).length < 1 && (
                  <p
                    className="mb-4 text-sm w-full p-2 leading-loose"
                    style={{
                      backgroundColor: 'var(--sidebar-inset-bg)',
                    }}
                  >
                    No dependencies are installed.
                  </p>
                )}
                {Object.entries(curProject.dependencies).map(([name, version], key) => (
                  <div
                    key={key}
                    className="p-4 rounded-sm my-2 flex"
                    style={{
                      backgroundColor: 'var(--sidebar-inset-bg)',
                    }}
                  >
                    <div className="left flex flex-col justify-center">
                      <p className="font-mono">{name}</p>
                      <div className="flex items-center">
                        <p className="text-xs opacity-50">{version ? version : 'Verison Not Specified'}</p>
                        <Link
                          className="hover:opacity-50 transition-all duration-200"
                          to={
                            curProject.project_type.toString() === 'NPM'
                              ? `https://www.npmjs.com/package/${name}`
                              : `https://crates.io/crates/${name}`
                          }
                          target="_blank"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 50 50">
                            <path fill="var(--icon-color)" d="m38.288 10.297l1.414 1.415l-14.99 14.99l-1.414-1.414z" />
                            <path
                              fill="var(--icon-color)"
                              d="M40 20h-2v-8h-8v-2h10zm-5 18H15c-1.7 0-3-1.3-3-3V15c0-1.7 1.3-3 3-3h11v2H15c-.6 0-1 .4-1 1v20c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V24h2v11c0 1.7-1.3 3-3 3z"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>
                    {curProject.project_type.toString() === 'NPM' && (
                      <div className="flex items-end justify-end flex-1 hover:opacity-50 transition-all duration-200">
                        <button
                          className="bg-red-500 text-sm p-2 rounded-md"
                          onClick={() => {
                            onUninstallDep(name);
                          }}
                        >
                          Uninstall
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <p className="opacity-50 font-medium text-sm mb-2 mt-8">Dev Dependencies</p>
                {Object.entries(curProject.dev_dependencies).length < 1 && (
                  <p
                    className="mb-4 text-sm w-full p-2 leading-loose"
                    style={{
                      backgroundColor: 'var(--sidebar-inset-bg)',
                    }}
                  >
                    No dev dependencies are installed.
                  </p>
                )}
                {Object.entries(curProject.dev_dependencies).map(([name, version], key) => (
                  <div
                    key={key}
                    className="p-4 rounded-sm my-2 flex"
                    style={{
                      backgroundColor: 'var(--sidebar-inset-bg)',
                    }}
                  >
                    <div className="left flex flex-col justify-center">
                      <p className="font-mono">{name}</p>
                      <div className="flex items-center">
                        <p className="text-xs opacity-50">{version ? version : 'Verison Not Specified'}</p>
                        <Link
                          className="hover:opacity-50 transition-all duration-200"
                          to={
                            curProject.project_type.toString() === 'NPM'
                              ? `https://www.npmjs.com/package/${name}`
                              : `https://crates.io/crates/${name}`
                          }
                          target="_blank"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 50 50">
                            <path fill="var(--icon-color)" d="m38.288 10.297l1.414 1.415l-14.99 14.99l-1.414-1.414z" />
                            <path
                              fill="var(--icon-color)"
                              d="M40 20h-2v-8h-8v-2h10zm-5 18H15c-1.7 0-3-1.3-3-3V15c0-1.7 1.3-3 3-3h11v2H15c-.6 0-1 .4-1 1v20c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V24h2v11c0 1.7-1.3 3-3 3z"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-end justify-end flex-1 hover:opacity-50 transition-all duration-200">
                      <button className="bg-red-500 text-sm p-2 rounded-md">Uninstall</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      </ReactModal>
      <ReactModal
        isOpen={show}
        onRequestClose={() => {
          setShow(false);
        }}
        style={{
          content: {
            backgroundColor: 'var(--sidebar-bg)',
            border: 'none',
            padding: 0,
            width: '60%',
            height: 'min-content',
            margin: 'auto',
            borderRadius: '8px',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <div className="p-4">
          <p className="mb-4 text-lg">Enter a commit message</p>
          <p
            style={{
              opacity: 'var(--light-text-opacity)',
            }}
            className="my-4 text-xs"
          >
            All character and length rules set by git still apply.
          </p>
          <input
            type="text"
            placeholder='i.e. "Initial commit"'
            className="w-full p-2 px-4 rounded-md text-white outline-none font-mono"
            style={{
              backgroundColor: 'var(--sidebar-inset-bg)',
              color: 'var(--sidebar-inset-text-color)',
            }}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
          <div className="flex justify-end my-4">
            <button
              className="bg-red-600 text-white p-2 rounded-lg mt-2 mr-4 text-sm hover:opacity-80 transition-all"
              onClick={() => {
                setShow(false);
              }}
            >
              Cancel
            </button>
            <button
              className="bg-green-600 text-white p-2 rounded-lg mt-2 text-sm hover:opacity-80 transition-all"
              onClick={() => {
                onCommit();
                setShow(false);
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </ReactModal>
      <Tooltip className="tooltip z-[999]" opacity={'100%'} id="tooltip-popularity">
        This is a score given based on how popular the package is. The higher the score, the more popular the package.
      </Tooltip>
      <Tooltip className="tooltip z-[999]" opacity={'100%'} id="tooltip-quality">
        This is a score given based on the quality of the package. The higher the score, the better the quality.
      </Tooltip>
    </>
  );
};
