import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { Login } from '../components/Login';
import { Register } from '../components/Register';
import { useGetUserLazyQuery } from '../graphql';
import { runtimeState } from '../lib/state/runtime.state';
import { Profile } from '../lib/types';

export const Auth = () => {
  const [method, setMethod] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const navigate = useNavigate();
  const [hasNetwork, setHasNetwork] = useState<boolean>(false);
  const [getUserQuery] = useGetUserLazyQuery();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkNetwork = () => {
    setHasNetwork(navigator.onLine);
    if (!navigator.onLine) {
      toast.error('No Internet Access');
    }
  };

  const checkAuth = async () => {
    if (runtime.profileStore) {
      const profiles = await runtime.profileStore.get<Profile[]>('profiles');
      const defaultProfile = await runtime.profileStore.get<number>('defaultProfile');

      if (defaultProfile) {
        setRuntime({
          ...runtime,
          currentUser: defaultProfile ?? 0,
        });
      }

      if (profiles && profiles.length > 0) {
        navigate('/drive/' + 0);
      }
    }

    checkNetwork();
  };

  const onTokenReceived = async (token: string) => {
    // TODO: Get profile request after creation or login at first time adding a profile
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
    }).then((res) => {
      user = res.data?.getUser;
    });

    if (!user) {
      toast.error('There was an issue logging you in.');
      return;
    }

    if (runtime.profileStore) {
      console.log(user);

      const profiles = await runtime.profileStore.get<Profile[]>('profiles');
      if (profiles) {
        profiles.push({
          addedOn: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          name: user.full_name,
          avatar: user.avatar,
          token: token,
        });

        // get index of last profile item
        let index = profiles?.length - 1;

        setRuntime({
          ...runtime,
          currentUser: index,
        });

        navigate('/drive/0');
      } else {
        await runtime.profileStore.set('profiles', [
          {
            addedOn: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            name: user.full_name,
            avatar: user.avatar,
            token: token,
          },
        ]);

        setRuntime({
          ...runtime,
          currentUser: 0,
        });

        navigate('/drive/0');
      }
    }
  };

  if (!hasNetwork) {
    return (
      <div className="w-screen h-full bg-body max-w-[600px] m-auto pt-14 flex flex-col justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 20 20">
          <circle cx="10" cy="16" r="2" fill="white" />
          <path
            fill="white"
            d="M16.4 11.6A7.1 7.1 0 0 0 12 9.1l3.4 3.4zM19 8.4A12.2 14 0 0 0 8.2 4.2L10 6a9.9 9.9 0 0 1 7.4 3.7zM3.5 2L2 3.4l2.2 2.2A13.1 13.1 0 0 0 1 8.4l1.5 1.3a10.7 10.7 0 0 1 3.2-2.6L8 9.3a7.3 7.3 0 0 0-3.3 2.3L6.1 13a5.2 5.2 0 0 1 3.6-2l6.8 7l1.5-1.5z"
          />
        </svg>
        <p className="text-2xl mb-8 mt-8">Network Error</p>
        <p className="leading-loose text-center text-sm">
          You currently have no network access and have not previously logged in. Bytes Browser only requires a network
          to login or upload files and will not require a network in the future if you have already authenticated your
          account.
        </p>
        <button
          onClick={checkNetwork}
          className="mt-8 border p-2 px-8 rounded transition-all cursor-pointer hover:opacity-50"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      {method === 'LOGIN' ? (
        <Login onTokenReceived={onTokenReceived} setMethod={setMethod} />
      ) : method === 'FORGOT_PASSWORD' ? (
        <p>Forgot Password</p>
      ) : (
        <Register onTokenReceived={onTokenReceived} setMethod={setMethod} />
      )}
    </>
  );
};
