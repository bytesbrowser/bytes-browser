import CryptoJS from 'crypto-js';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LineWave } from 'react-loader-spinner';
import ReactModal from 'react-modal';
import Moment from 'react-moment';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { useGetSubscriptionStatusLazyQuery, useGetUserLazyQuery, useLoginLazyQuery } from '../../graphql';
import { runtimeState } from '../../lib/state/runtime.state';
import { Profile, ProfileStore } from '../../lib/types';
import { is_email } from '../../lib/utils/formChecker';

export const SettingsProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [loginQuery, loginQueryResult] = useLoginLazyQuery();
  const [form, setForm] = useState({ email: { value: '', valid: true }, password: { value: '', valid: true } });
  const [hasNetwork, setHasNetwork] = useState<boolean>(false);
  const [getUserQuery] = useGetUserLazyQuery();
  const navigate = useNavigate();
  const [getSubStatus] = useGetSubscriptionStatusLazyQuery();
  const [show, setShow] = useState(false);
  const [pin, setPin] = useState<{
    0: number | undefined;
    1: number | undefined;
    2: number | undefined;
    3: number | undefined;
  }>({
    0: undefined,
    1: undefined,
    2: undefined,
    3: undefined,
  });

  const [pinState, setPinState] = useState<{ for: number; encrypted: string } | null>(null);

  const checkNetwork = () => {
    setHasNetwork(navigator.onLine);
  };

  useEffect(() => {
    getProfiles();
  }, []);

  const getProfiles = async () => {
    if (runtime.profileStore) {
      const profs = await runtime.profileStore.get<Profile[]>('profiles');

      if (profs) {
        setProfiles(profs);
      }
    }
  };

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();

    const profiles = await runtime.profileStore.get<Profile[]>('profiles');

    if (profiles?.find((prof) => prof.email === form.email.value)) {
      toast.error('This profile is already signed in.');
      return;
    }

    if (!form.email.value || !form.password.value) {
      return;
    }

    if (!is_email(form.email.value) || form.password.value.length < 5) {
      return;
    }

    loginQuery({
      variables: { email: form.email.value, password: form.password.value },
      context: {
        headers: {
          Authorization: '',
        },
      },
    }).then((res) => {
      if (res.data) {
        toast.success('User added successfully.');
        onTokenReceived(res.data.login);
      }
    });
  };

  useEffect(() => {
    if (loginQueryResult.error) {
      if (loginQueryResult.error.message.includes('JSON object requested, multiple (or no) rows returned')) {
        toast.error('Invalid Email');
      } else {
        toast.error(loginQueryResult.error.message);
      }
    }
  }, [loginQueryResult.error]);

  const onTokenReceived = async (token: string) => {
    let user:
      | {
          id: string;
          full_name: string;
          email: string;
          created_at: string;
          password: string;
          avatar?: string | undefined;
        }
      | undefined;

    await getUserQuery({
      context: {
        headers: {
          Authorization: token,
        },
      },
      fetchPolicy: 'no-cache',
    }).then((res) => {
      user = res.data?.getUser;
    });

    if (!user) {
      toast.error('There was an issue logging you in.');
      return;
    }

    if (runtime.profileStore) {
      const profiles = await runtime.profileStore.get<Profile[]>('profiles');

      if (profiles) {
        profiles.push({
          addedOn: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          name: user.full_name,
          avatar: user.avatar,
          email: user.email,
          token: token,
        });

        setProfiles(profiles);

        await runtime.profileStore.set('profiles', profiles);

        await runtime.profileStore.save();

        setForm({
          email: { value: '', valid: true },
          password: { value: '', valid: true },
        });
      }
    }
  };

  const checkHasPin = async (key: number): Promise<[boolean, string]> => {
    let res = false;
    let encrypted = '';

    await runtime.store.get<ProfileStore>(`profile-store-${key}`).then(async (db) => {
      if (db) {
        if (db.pinLock) {
          res = true;
          encrypted = db.pinLock;
          return;
        } else {
          res = false;
          return;
        }
      } else {
        res = false;
        return;
      }
    });

    return [res, encrypted];
  };

  const on_remove = async (index: number) => {
    if (runtime.currentUser === index) {
      toast.error('Cannot remove the current user. Please logout or switch profiles first.');
      return;
    }

    let profiles = await runtime.profileStore.get<Profile[]>('profiles');

    if (profiles) {
      if (profiles.length > 1) {
        let profilesWithSub: Profile[] = [];

        for (let i = 0; i < profiles.length; i++) {
          await getSubStatus({
            context: {
              headers: {
                Authorization: profiles[i].token,
              },
            },
            fetchPolicy: 'no-cache',
            nextFetchPolicy: 'no-cache',
          }).then((res) => {
            if (res.error) return;

            if (res.data?.getSubscriptionStatus.active && profiles) {
              profilesWithSub.push(profiles[i]);
            }
          });

          continue;
        }

        if (profilesWithSub.length === 1 && profilesWithSub[0].email === profiles[index].email) {
          toast.error("You cannot remove this profile because other profiles rely on it's subscription.");
          return;
        }
      }
    }

    if (runtime.profileStore) {
      runtime.profileStore.get<Profile[]>('profiles').then((profiles) => {
        if (profiles) {
          profiles.splice(index, 1);

          runtime.profileStore
            .set('profiles', profiles)
            .then(() => {
              setProfiles(profiles);
            })
            .then(() => {
              runtime.profileStore.save();
            });
        }
      });
    }
  };

  const useUser = async (key: number) => {
    const [hasPin, encrypted] = await checkHasPin(key);

    if (hasPin) {
      setShow(true);
      setPinState({ for: key, encrypted });
      return;
    }

    if (runtime.profileStore) {
      runtime.profileStore.get<Profile[]>('profiles').then((profiles) => {
        if (profiles) {
          setRuntime({
            ...runtime,
            readVolumes: false,
            currentUser: key,
          });

          navigate('/');
        }
      });
    }
  };

  const onConfirmPin = async () => {
    const nums = [pin[0], pin[1], pin[2], pin[3]];

    if (!pinState || !pinState.encrypted) return;

    const bytes = CryptoJS.AES.decrypt(pinState.encrypted, import.meta.env.VITE_ENCRYPTOR_KEY.trim());
    const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    if (nums.join('') === data) {
      if (runtime.profileStore) {
        runtime.profileStore.get<Profile[]>('profiles').then((profiles) => {
          if (profiles) {
            setRuntime({
              ...runtime,
              readVolumes: false,
              currentUser: pinState.for,
            });

            navigate('/');
          }
        });
      }
    }
  };

  const setPinWithRules = (value: string, index: 0 | 1 | 2 | 3) => {
    console.log('Setting pin with rules', value);

    if (value.length === 0) {
      const newPinCopy = { ...pin };

      newPinCopy[index] = undefined;

      setPin(newPinCopy);
      return;
    }

    if (value.length > 1) {
      const newPinCopy = { ...pin };

      newPinCopy[index] = 0;

      setPin(newPinCopy);
      return;
    }

    if (isNaN(Number(value))) {
      console.log('NAN!!!');

      const newPinCopy = { ...pin };

      newPinCopy[index] = 0;

      console.log(newPinCopy);

      setPin(newPinCopy);
      return;
    }

    if (Number(value) < 0 || Number(value) > 9) {
      const newPinCopy = { ...pin };

      newPinCopy[index] = 0;

      setPin(newPinCopy);
      return;
    }

    const newPinCopy = { ...pin };

    newPinCopy[index] = Number(value);

    setPin(newPinCopy);
  };

  return (
    <>
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
        <>
          <div className="py-6 shadow-md rounded-md animate__animated animate__fadeIn flex flex-col justify-center items-center">
            <h2 className="text-md opacity-80 mb-4">Enter A New Pin</h2>
            <div className="flex space-x-8">
              <input
                type="text"
                placeholder="0"
                maxLength={1}
                value={pin[0] ?? undefined}
                onChange={(e) => setPinWithRules(e.target.value, 0)}
                min={0}
                max={9}
                className="pin-input bg-transparent rounded-lg border w-14 h-14 text-center"
              />
              <input
                type="text"
                placeholder="0"
                maxLength={1}
                value={pin[1]}
                onChange={(e) => setPinWithRules(e.target.value, 1)}
                min={0}
                max={9}
                className="pin-input bg-transparent rounded-lg border w-14 h-14 text-center"
              />
              <input
                type="text"
                placeholder="0"
                maxLength={1}
                value={pin[2]}
                onChange={(e) => setPinWithRules(e.target.value, 2)}
                min={0}
                max={9}
                className="pin-input bg-transparent rounded-lg border w-14 h-14 text-center"
              />
              <input
                type="text"
                placeholder="0"
                maxLength={1}
                value={pin[3]}
                onChange={(e) => setPinWithRules(e.target.value, 3)}
                min={0}
                max={9}
                className="pin-input bg-transparent rounded-lg border w-14 h-14 text-center"
              />
            </div>
            <div className="flex">
              <p
                onClick={() => {
                  setPin({
                    0: undefined,
                    1: undefined,
                    2: undefined,
                    3: undefined,
                  });
                  setShow(false);
                }}
                style={{
                  color: 'var(--sidebar-inset-text-color)',
                }}
                className="mr-4 mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all"
              >
                Cancel
              </p>
              <p
                onClick={onConfirmPin}
                style={{
                  color: 'var(--sidebar-inset-text-color)',
                  opacity: pin[0] && pin[1] && pin[2] && pin[3] ? 1 : 0.5,
                }}
                className="mb-4 text-sm mt-10 bg-blue-500 w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all"
              >
                Confirm
              </p>
            </div>
          </div>
        </>
      </ReactModal>
      <form onSubmit={onLogin} className="flex flex-col w-[500px]">
        <h2>Add a profile</h2>
        <p className="text-sm mt-4 mb-4 opacity-70">Sign in to your account</p>
        <p
          className="mb-8 text-sm"
          style={{
            opacity: 'var(--light-text-opacity)',
          }}
        >
          Signing into profiles on this device will add them to your team. Removing them will disable team access. Only
          one user needs to have an activated license.
        </p>

        <p
          className="mb-4 opacity-50 text-md"
          style={{
            opacity: 'var(--light-text-opacity)',
          }}
        >
          Email
        </p>
        <input
          type="email"
          style={{
            borderColor: 'var(--sidebar-border-color)',
            backgroundColor: 'var(--sidebar-inset-bg)',
            color: 'var(--sidebar-inset-text-color)',
          }}
          required
          className={`text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px] ${
            !form.email.valid && 'border-error focus:border-error'
          }`}
          placeholder="you@example.com"
          value={form.email.value}
          onChange={(e) =>
            setForm({
              ...form,
              email: {
                ...form.email,
                value: e.target.value,
              },
            })
          }
        />
        {!form.email.valid && <p className="text-xs text-error mt-4">Please provide a valid email.</p>}

        <div className="flex justify-between items-center mb-4 mt-8">
          <p
            className="opacity-50 text-md"
            style={{
              opacity: 'var(--light-text-opacity)',
            }}
          >
            Password
          </p>
        </div>
        <input
          style={{
            borderColor: 'var(--sidebar-border-color)',
            backgroundColor: 'var(--sidebar-inset-bg)',
            color: 'var(--sidebar-inset-text-color)',
          }}
          required
          type="password"
          className={`text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px] ${
            !form.password.valid && 'border-error focus:border-error'
          }`}
          placeholder="●●●●●●●●"
          onChange={(e) =>
            setForm({
              ...form,
              password: {
                ...form.password,
                value: e.target.value,
              },
            })
          }
          value={form.password.value}
        />
        <div className="mb-12 w-[250px]">
          {!form.password.valid && <p className="text-xs text-error mt-4">Password must be at least 5 characters.</p>}
          {loginQueryResult.loading ? (
            <LineWave color="var(--icon-color)" wrapperStyle={{ margin: '0 auto' }} />
          ) : (
            <button
              style={{
                color: 'var(--sidebar-inset-text-color)',
              }}
              type="submit"
              className="w-full mt-8 bg-success p-2 rounded-md transition-all hover:opacity-50"
            >
              Sign In
            </button>
          )}
        </div>
      </form>

      <h2>Profiles Signed In On This Device</h2>
      <div className="profiles pb-20">
        {profiles.map((profile, key) => (
          <div key={key} className="mt-8 border-t border-white border-opacity-10">
            <img src={profile.avatar} alt="" className="w-20 h-20 rounded-full my-6" />
            <p className="font-medium mb-4">{profile.name}</p>
            <p
              className="mb-4"
              style={{
                opacity: 'var(--light-text-opacity)',
              }}
            >
              Added <Moment date={profile.addedOn} fromNow />
            </p>
            <p
              className="opacity-50 mb-8"
              style={{
                opacity: 'var(--light-text-opacity)',
              }}
            >
              Last Signed In <Moment date={profile.lastUsed} fromNow />
            </p>

            {profiles.length >= 2 ? (
              <>
                <p
                  onClick={() => on_remove(key)}
                  style={{
                    color: 'var(--sidebar-inset-text-color)',
                  }}
                  className="bg-error mb-8 p-2 text-sm max-w-[250px] rounded mt-4 text-center transition-all hover:opacity-50 cursor-pointer"
                >
                  Remove From This Device
                </p>
                {key != runtime.currentUser && (
                  <p
                    onClick={() => useUser(key)}
                    style={{
                      color: 'var(--sidebar-inset-text-color)',
                    }}
                    className="bg-success mb-8 p-2 text-sm max-w-[250px] rounded mt-4 text-center transition-all hover:opacity-50 cursor-pointer"
                  >
                    Use This Profile
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs opacity-50">
                Cannot remove from device. This profile is the only profile present. You must logout.
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
};
