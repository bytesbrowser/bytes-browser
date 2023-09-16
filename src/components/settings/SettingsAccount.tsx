import { FormEvent, useEffect, useRef, useState } from 'react';
import Moment from 'react-moment';
import { useRecoilState } from 'recoil';

import { User, useGetUserQuery } from '../../graphql';
import { runtimeState } from '../../lib/state/runtime.state';
import { ProfileStore } from '../../lib/types';

export const SettingsAccount = () => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const { data, error } = useGetUserQuery();
  const [profile, setProfile] = useState<User | undefined>(undefined);
  const [changes, setChanges] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [editingPin, setEditingPin] = useState<boolean>(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [hasPin, setHasPin] = useState<boolean>(false);

  const onSetPin = () => {
    setEditingPin(true);
  };

  useEffect(() => {
    if (data?.getUser) {
      setProfile(data.getUser);
      setChanges({
        ...changes,
        fullName: data.getUser.full_name,
        email: data.getUser.email,
      });
      setAvatarPreview(data.getUser.avatar!);

      runtime.store.get<ProfileStore>(`profile-store-${runtime.currentUser}`).then(async (db) => {
        if (db) {
          if (db.pinLock) {
            setHasPin(true);
          } else {
            setHasPin(false);
          }
        } else {
          setHasPin(false);
        }
      });
    }
  }, [data]);

  useEffect(() => {
    if (editingPin) {
      document.querySelectorAll('.pin-input').forEach((input, index, inputArray) => {
        input.addEventListener('keyup', (e) => {
          if (e && e.target && e.target) {
            const nextInput = inputArray[index + 1];
            if (nextInput) {
              //@ts-ignore
              nextInput.focus();
            }
          }
        });
      });
    }
  }, [editingPin]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };

      reader.readAsDataURL(file);
    }
  };

  const triggerAvatarUpload = () => {
    avatarInputRef.current && avatarInputRef.current.click();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      {profile?.created_at && (
        <p
          className="text-xs mb-8"
          style={{
            opacity: 'var(--light-text-opacity)',
          }}
        >
          Account Created <Moment date={new Date(profile?.created_at!)} fromNow />
        </p>
      )}

      <div onClick={triggerAvatarUpload}>
        {avatarPreview ? (
          <img
            data-tooltip-id="avatar-tooltip"
            src={avatarPreview}
            className="w-16 h-1w-16 rounded-full cursor-pointer transition-all hover:opacity-50 mb-8"
          />
        ) : (
          <img
            data-tooltip-id="avatar-tooltip"
            src="https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
            className="w-16 h-1w-16 rounded-full cursor-pointer transition-all hover:opacity-5 mb-8"
          />
        )}
      </div>
      <input ref={avatarInputRef} type="file" style={{ display: 'none' }} onChange={handleAvatarChange} />

      <p
        className="mb-4 text-md"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        Full Name
      </p>
      <input
        type="text"
        value={changes.fullName}
        required
        onChange={(e) => setChanges({ ...changes, fullName: e.target.value })}
        placeholder="John Doe"
        style={{
          borderColor: 'var(--sidebar-border-color)',
          backgroundColor: 'var(--sidebar-inset-bg)',
          color: 'var(--sidebar-inset-text-color)',
        }}
        className="text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />

      <p
        className="mb-4 opacity-50 text-md mt-8"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        Email Address
      </p>
      <input
        style={{
          borderColor: 'var(--sidebar-border-color)',
          backgroundColor: 'var(--sidebar-inset-bg)',
          color: 'var(--sidebar-inset-text-color)',
        }}
        type="email"
        required
        readOnly
        value={changes.email}
        onChange={(e) => setChanges({ ...changes, email: e.target.value })}
        placeholder="johndoe@bytesbrowser.com"
        className="text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />

      <p
        className="mb-4 opacity-50 text-md mt-8"
        style={{
          opacity: 'var(--light-text-opacity)',
        }}
      >
        Change Password
      </p>
      <input
        style={{
          borderColor: 'var(--sidebar-border-color)',
          backgroundColor: 'var(--sidebar-inset-bg)',
          color: 'var(--sidebar-inset-text-color)',
        }}
        required
        type="password"
        value={changes.password}
        onChange={(e) => setChanges({ ...changes, password: e.target.value })}
        placeholder="*********"
        className="text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />
      {!editingPin && (
        <p
          onClick={onSetPin}
          style={{
            color: 'var(--sidebar-inset-text-color)',
          }}
          className="mb-4 text-sm mt-10 bg-blue-500 w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all"
        >
          {hasPin ? 'Change PIN' : 'Add PIN'}
        </p>
      )}
      {editingPin && (
        <>
          <div className="py-6 shadow-md rounded-md">
            <h2 className="text-md opacity-80 mb-4">Pin Code</h2>
            <div className="flex space-x-8">
              <input
                type="number"
                placeholder="0"
                maxLength={1}
                min={0}
                max={9}
                className="pin-input bg-transparent rounded-lg border w-20 h-20 text-center"
              />
              <input
                type="number"
                placeholder="0"
                maxLength={1}
                min={0}
                max={9}
                className="pin-input bg-transparent rounded-lg border w-20 h-20 text-center"
              />
              <input
                type="number"
                placeholder="0"
                maxLength={1}
                min={0}
                max={9}
                className="pin-input bg-transparent rounded-lg border w-20 h-20 text-center"
              />
              <input
                type="number"
                placeholder="0"
                maxLength={1}
                min={0}
                max={9}
                className="pin-input bg-transparent rounded-lg border w-20 h-20 text-center"
              />
            </div>
            <div className="flex">
              <p
                style={{
                  color: 'var(--sidebar-inset-text-color)',
                }}
                className="mr-4 mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all"
              >
                Cancel
              </p>
              <p
                style={{
                  color: 'var(--sidebar-inset-text-color)',
                }}
                className="mb-4 text-sm mt-10 bg-blue-500 w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all"
              >
                Confirm
              </p>
            </div>
          </div>
        </>
      )}
      <button
        type="submit"
        style={{
          color: 'var(--sidebar-inset-text-color)',
        }}
        className={`mb-4 text-sm mt-10 bg-success w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all`}
      >
        Save Changes
      </button>
      <p
        style={{
          color: 'var(--sidebar-inset-text-color)',
        }}
        className="mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all"
      >
        Close Account
      </p>
    </form>
  );
};
