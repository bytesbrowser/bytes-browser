import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LineWave } from 'react-loader-spinner';
import Moment from 'react-moment';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { useGetUserLazyQuery, useLoginLazyQuery } from '../../graphql';
import { runtimeState } from '../../lib/state/runtime.state';
import { Profile } from '../../lib/types';
import { is_email } from '../../lib/utils/formChecker';

export const SettingsProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const [loginQuery, loginQueryResult] = useLoginLazyQuery();
  const [form, setForm] = useState({ email: { value: '', valid: true }, password: { value: '', valid: true } });
  const [hasNetwork, setHasNetwork] = useState<boolean>(false);
  const [getUserQuery] = useGetUserLazyQuery();
  const navigate = useNavigate();

  const checkNetwork = () => {
    setHasNetwork(navigator.onLine);
  };

  useEffect(() => {
    getProfiles();
  }, []);

  const getProfiles = async () => {
    if (runtime.profileStore) {
      const profs = await runtime.profileStore.get<Profile[]>('profiles');

      console.log(profs);

      if (profs) {
        setProfiles(profs);
      }
    }
  };

  const onLogin = (e: FormEvent) => {
    e.preventDefault();

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
          token: token,
        });

        // TODO!
        setProfiles(profiles);

        await runtime.profileStore.set('profiles', profiles);

        setForm({
          email: { value: '', valid: true },
          password: { value: '', valid: true },
        });
      }
    }
  };

  const on_remove = (index: number) => {
    if (runtime.currentUser === index) {
      toast.error('Cannot remove the current user. Please logout or switch profiles first.');
      return;
    }

    if (runtime.profileStore) {
      runtime.profileStore.get<Profile[]>('profiles').then((profiles) => {
        if (profiles) {
          profiles.splice(index, 1);

          runtime.profileStore.set('profiles', profiles).then(() => {
            setProfiles(profiles);
          });
        }
      });
    }
  };

  const useUser = (key: number) => {
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

  return (
    <>
      <form onSubmit={onLogin} className="flex flex-col w-[500px]">
        <h2>Add a profile</h2>
        <p className="text-sm mt-4 mb-4 opacity-70">Sign in to your account</p>
        <p className="mb-8 text-sm opacity-50">
          Signing into profiles on this device will add them to your team. Removing them will disable team access. Only
          one user needs to have an activated license.
        </p>

        <p className="mb-4 opacity-50 text-md">Email</p>
        <input
          type="email"
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
          <p className="opacity-50 text-md">Password</p>
        </div>
        <input
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
            <LineWave color="white" wrapperStyle={{ margin: '0 auto' }} />
          ) : (
            <button type="submit" className="w-full mt-8 bg-success p-2 rounded-md transition-all hover:opacity-50">
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
            <p className="font-light mb-4">{profile.name}</p>
            <p className="opacity-50 mb-4">
              Added <Moment date={profile.addedOn} fromNow />
            </p>
            <p className="opacity-50 mb-8">
              Last Signed In <Moment date={profile.lastUsed} fromNow />
            </p>

            {profiles.length >= 2 ? (
              <>
                <p
                  onClick={() => on_remove(key)}
                  className="bg-error mb-8 p-2 text-sm max-w-[250px] rounded mt-4 text-center transition-all hover:opacity-50 cursor-pointer"
                >
                  Remove From This Device
                </p>
                {key != runtime.currentUser && (
                  <p
                    onClick={() => useUser(key)}
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
