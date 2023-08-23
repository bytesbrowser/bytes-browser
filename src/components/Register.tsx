import { Dispatch, FormEvent, SetStateAction, useEffect, useRef, useState } from 'react';
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
  const [version, setVersion] = useState('');
  const [form, setForm] = useState({
    email: { value: '', valid: true },
    password: { value: '', valid: true },
    fullName: { value: '', valid: true },
    avatar: { value: '', valid: true },
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [registerMutation, registerMutationResult] = useRegisterMutation();

  useEffect(() => {
    getVersionString().then((v) => setVersion(v));
  }, []);

  const onRegister = (e: FormEvent) => {
    e.preventDefault();

    if (!form.email.value || !form.password.value) {
      return;
    }

    if (!is_email(form.email.value) || form.password.value.length < 5) {
      return;
    }

    registerMutation({
      variables: {
        params: {
          email: form.email.value,
          password: form.password.value,
          fullName: form.fullName.value,
          avatar: form.avatar.value ? form.avatar.value : undefined,
        },
      },
    }).then((res) => {
      if (res.data) {
        onTokenReceived(res.data.register);
      }
    });
  };

  useEffect(() => {
    let emailValid = is_email(form.email.value);
    let passwordValid = form.password.value.length >= 5;

    if (form.email.value.length < 1) {
      emailValid = true;
    }

    if (form.password.value.length < 1) {
      passwordValid = true;
    }

    setForm({
      ...form,
      email: {
        ...form.email,
        valid: emailValid,
      },
      password: {
        ...form.password,
        valid: passwordValid,
      },
    });
  }, [form.email.value, form.password.value]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setForm({
          ...form,
          avatar: {
            ...form.avatar,
            value: reader.result as string,
          },
        });
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

  return (
    <div className="animate__animated animate__fadeIn flex flex-col justify-between items-center w-screen h-full mt-8 bg-content pb-4">
      <div>
        <img src="/bytes_logo.png" className="w-[120px]" />
      </div>
      <form onSubmit={onRegister} className="flex flex-col w-[500px]">
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
          className={`text-sm w-full p-3 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px] ${
            !form.fullName.valid && 'border-error focus:border-error'
          }`}
          placeholder="John Doe"
          value={form.fullName.value}
          onChange={(e) =>
            setForm({
              ...form,
              fullName: {
                ...form.fullName,
                value: e.target.value,
              },
            })
          }
        />
        {!form.fullName.valid && <p className="text-xs text-error mt-4">Please provide a valid name.</p>}

        <p className="mb-4 opacity-50 text-md mt-8">Email</p>
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
          type="password"
          required
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
        {!form.password.valid && <p className="text-xs text-error mt-4">Password must be at least 5 characters.</p>}
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
