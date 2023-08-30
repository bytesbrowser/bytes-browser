import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { Item, Menu, Separator, Submenu } from 'react-contexify';
import { toast } from 'react-hot-toast';
import { ThreeCircles } from 'react-loader-spinner';
import ReactModal from 'react-modal';
import { useRecoilState } from 'recoil';

import DirectoryEmitter from '../lib/emitters/directory.emitter';
import { currentContextState } from '../lib/state/currentContext.state';
import { DirectoryContents, GitMeta } from '../lib/types';

export const ContextMenu = () => {
  const [currentContext, setCurrentContext] = useRecoilState(currentContextState);
  const [preview, setPreview] = useState({ value: '', loading: true });
  const [gitMeta, setGitMeta] = useState<GitMeta | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [show, setShow] = useState(false);
  const [commitItem, setCommitItem] = useState<DirectoryContents | null>(null);

  const onDelete = async () => {
    if (currentContext.currentItem) {
      const item = currentContext.currentItem;

      const confirmed = await confirm(
        'Are you sure you want to delete ' + (item['Directory'] ? item['Directory']![0] : item['File']![0]) + '?',
      );

      if (!confirmed) {
        toast.error('Deletion cancelled.');
      }

      toast.promise(
        invoke('delete_file', {
          path: item['Directory'] ? item['Directory']![1] : item['File']![1],
          isDir: item['Directory'] ? true : false,
        }).then(() => {
          DirectoryEmitter.emit('delete', {});

          setCurrentContext({
            ...currentContext,
            currentItem: null,
          });
        }),
        {
          error: 'Failed to delete ' + (item['Directory'] ? item['Directory']![0] : item['File']![0]),
          loading: 'Deleting ' + (item['Directory'] ? item['Directory']![0] : item['File']![0]),
          success: 'Deleted ' + (item['Directory'] ? item['Directory']![0] : item['File']![0]),
        },
      );
    }
  };

  useEffect(() => {
    const item = currentContext.currentItem;

    if (!item) return;

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
          className=" pt-2 pb-2"
          style={{
            marginLeft: '5px',
          }}
        >
          {preview.value.includes('data:') && !preview.loading && (
            <>
              <p className="mb-4 opacity-50">File Preview</p>

              <img src={preview.value} className="w-full rounded-lg shadow-lg mb-4 m-auto" />
            </>
          )}
          {!preview.value.includes('data:') && !preview.loading && preview.value.length > 0 && (
            <>
              <p className="mb-4 opacity-50">File Preview</p>
              <p className="text-sm mb-4">{preview.value}...</p>
            </>
          )}
          {preview.loading && (
            <div className="m-auto flex justify-center items-center scale-75">
              <ThreeCircles color="white" />
            </div>
          )}
          <p className="text-md font-light opacity-50">
            {currentContext.currentItem &&
              (currentContext.currentItem['File']
                ? 'File: ' + currentContext.currentItem['File'][0]
                : 'Folder: ' + currentContext.currentItem['Directory']![0])}
          </p>
        </div>
        <Separator />

        <Item id="duplicate">Duplicate</Item>
        <Item id="cut">Cut</Item>
        <Item id="copy">Copy</Item>
        <Item disabled id="paste">
          Paste
        </Item>
        <Item id="rename">Rename</Item>
        <Item id="delete" onClick={onDelete} color="red">
          <p className="text-error">Delete</p>
        </Item>
        <Separator />
        <Submenu
          label={
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256">
                <g fill="none">
                  <rect width="256" height="256" fill="#F03C2E" rx="60" />
                  <g clip-path="url(#skillIconsGit0)">
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
              <p className="ml-2">Git</p>
            </div>
          }
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
          <Item id="commit" onClick={addAllChanges}>
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
      </Menu>
      <ReactModal
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
        <p>Enter a commit message</p>
        <input
          type="text"
          className="w-full p-2 rounded-lg bg-gray-800 text-white outline-none"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            className="bg-gray-800 text-white p-2 rounded-lg mt-2 mr-2"
            onClick={() => {
              setShow(false);
            }}
          >
            Cancel
          </button>
          <button
            className="bg-gray-800 text-white p-2 rounded-lg mt-2 mr-2"
            onClick={() => {
              onCommit();
              setShow(false);
            }}
          >
            Commit
          </button>
        </div>
      </ReactModal>
    </>
  );
};
