import { Dispatch, FormEvent, SetStateAction, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { LineWave } from 'react-loader-spinner';
import { Tooltip } from 'react-tooltip';

import { useRegisterMutation } from '../graphql';
import { is_email } from '../lib/utils/formChecker';
import { getVersionString } from '../lib/utils/getVersion';

export const Register = ({
  setMethod,
  onTokenReceived,
}: {
  setMethod: Dispatch<SetStateAction<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>>;
  onTokenReceived: (token: string) => Promise<void>;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [version, setVersion] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [registerMutation, registerMutationResult] = useRegisterMutation();

  useEffect(() => {
    getVersionString().then((v) => setVersion(v));
  }, []);

  const onRegister = (handler: any) => {
    if (!handler['fullName'] || !handler['email'] || !handler['password']) {
      toast.error('Please fill all the fields.');
      return;
    }

    if (errors['fullName'] || errors['email'] || errors['password']) {
      toast.error('Please fill all the fields.');
      return;
    }

    registerMutation({
      variables: {
        params: {
          email: handler['email'],
          password: handler['password'],
          fullName: handler['fullName'],
          avatar: avatarPreview ? avatarPreview : undefined,
        },
      },
    }).then((res) => {
      if (res.data) {
        onTokenReceived(res.data.register);
      }
    });
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

  useEffect(() => {
    if (registerMutationResult.error) {
      toast.error(registerMutationResult.error.message);
    }
  }, [registerMutationResult.error]);

  console.log(errors);

  return (
    <div className="animate__animated animate__fadeIn flex flex-col justify-between items-center w-screen h-full bg-content mt-8 pb-4">
      <div>
        <img src="/byteslogo.svg" className="w-[120px] mt-8" />
      </div>
      <form onSubmit={handleSubmit(onRegister)} className="flex flex-col w-[500px]">
        <h1 className="text-2xl">Get Started</h1>
        <p className="text-sm mt-4 mb-6 opacity-70">Create a new account</p>

        <p className="mb-4 opacity-50 text-md mt-8">Avatar</p>
        <div onClick={triggerAvatarUpload}>
          {avatarPreview ? (
            <img
              data-tooltip-id="avatar-tooltip"
              src={avatarPreview}
              className="mb-4 w-16 h-1w-16 rounded-full cursor-pointer transition-all hover:opacity-50"
            />
          ) : (
            <img
              data-tooltip-id="avatar-tooltip"
              src="https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
              className="mb-4 w-16 h-1w-16 rounded-full cursor-pointer transition-all hover:opacity-50"
            />
          )}
        </div>
        <input ref={avatarInputRef} type="file" style={{ display: 'none' }} onChange={handleAvatarChange} />

        <p className="mb-4 mt-4 opacity-50 text-md">Full Name</p>
        <input
          type="text"
          required
          placeholder="John Doe"
          {...register('fullName', { required: true, minLength: 2 })}
          className={`text-sm w-full p-3 rounded-md border transition-all bg-sidebar outline-none max-w-[500px] ${
            errors['fullName'] ? 'border-error focus:border-error' : 'border-light-border focus:border-gray-400'
          }`}
        />
        {errors['fullName'] && (
          <>
            {errors['fullName'].type === 'required' && <p className="text-xs text-error mt-4">Name is required.</p>}
            {errors['fullName'].type === 'minLength' && (
              <p className="text-xs text-error mt-4">Name must be at least 2 characters.</p>
            )}
          </>
        )}

        <p className="mb-4 opacity-50 text-md mt-8">Email</p>
        <input
          type="email"
          required
          placeholder="you@example.com"
          {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
          className={`text-sm w-full p-3 rounded-md border transition-all bg-sidebar outline-none max-w-[500px] ${
            errors['email'] ? 'border-error focus:border-error' : 'border-light-border focus:border-gray-400'
          }`}
        />
        {errors['email'] && (
          <>
            {errors['email'].type === 'required' && <p className="text-xs text-error mt-4">Email is required.</p>}
            {errors['email'].type === 'pattern' && <p className="text-xs text-error mt-4">Email must be valid.</p>}
          </>
        )}

        <div className="flex justify-between items-center mb-4 mt-8">
          <p className="opacity-50 text-md">Password</p>
        </div>
        <input
          type="password"
          required
          className={`text-sm w-full p-3 rounded-md border transition-all bg-sidebar outline-none max-w-[500px] ${
            errors['password'] ? 'border-error focus:border-error' : 'border-light-border focus:border-gray-400'
          }`}
          placeholder="●●●●●●●●"
          {...register('password', { required: true, minLength: 5 })}
        />
        {errors['password'] && (
          <>
            {errors['password'].type === 'minLength' && (
              <p className="text-xs text-error mt-4">Password must be at least 5 characters.</p>
            )}
            {errors['password'].type === 'required' && <p className="text-xs text-error mt-4">Password is required.</p>}
          </>
        )}

        {registerMutationResult.loading ? (
          <LineWave color="white" wrapperStyle={{ margin: '0 auto' }} />
        ) : (
          <button type="submit" className="mt-8 bg-success p-2 rounded-md transition-all hover:opacity-50">
            Sign Up
          </button>
        )}
        <p className="mt-8 text-center">
          <span className="opacity-50">Have an account?</span>{' '}
          <span
            className="underline cursor-pointer transition-all hover:text-yellow-500"
            onClick={() => setMethod('LOGIN')}
          >
            Sign In Now
          </span>
        </p>
      </form>
      <div className="mb-4 opacity-20 text-xs">
        <p>{version}</p>
      </div>
      <Tooltip id="avatar-tooltip" content="Upload Image" place="right" />
    </div>
  );
};
