import { FormEvent, useEffect, useRef, useState } from 'react';
import Moment from 'react-moment';

import { User, useGetUserLazyQuery, useGetUserQuery } from '../../graphql';

export const SettingsAccount = () => {
  const { data, error } = useGetUserQuery();
  const [profile, setProfile] = useState<User | undefined>(undefined);
  const [changes, setChanges] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    console.log(error);
    if (data?.getUser) {
      setProfile(data.getUser);
      setChanges({
        ...changes,
        fullName: data.getUser.full_name,
      });
      setAvatarPreview(data.getUser.avatar!);
    }
  }, [data]);

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
    <form onSubmit={onSubmit}>
      {profile?.created_at && (
        <p className="text-xs opacity-50 mb-8">
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

      <p className="mb-4 opacity-50 text-md">Full Name</p>
      <input
        type="text"
        value={changes.fullName}
        required
        onChange={(e) => setChanges({ ...changes, fullName: e.target.value })}
        placeholder="John Doe"
        className="text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />

      <p className="mb-4 opacity-50 text-md mt-8">Email Address</p>
      <input
        type="email"
        required
        readOnly
        value={changes.email}
        onChange={(e) => setChanges({ ...changes, email: e.target.value })}
        placeholder="johndoe@bytesbrowser.com"
        className="text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />

      <p className="mb-4 opacity-50 text-md mt-8">Change Password </p>
      <input
        required
        type="password"
        value={changes.password}
        onChange={(e) => setChanges({ ...changes, password: e.target.value })}
        placeholder="*********"
        className="text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />

      <button
        type="submit"
        className={`mb-4 text-sm mt-10 bg-success w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all`}
      >
        Save Changes
      </button>
      <p className="mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all">
        Close Account
      </p>
    </form>
  );
};
