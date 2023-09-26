import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { LineWave } from 'react-loader-spinner';

import { useLoginLazyQuery } from '../graphql';
import { getVersionString } from '../lib/utils/getVersion';

export const Login = ({
  setMethod,
  onTokenReceived,
}: {
  setMethod: Dispatch<SetStateAction<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>>;
  onTokenReceived: (token: string) => Promise<void>;
}) => {
  const [loginQuery, loginQueryResult] = useLoginLazyQuery();
  const [version, setVersion] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    getVersionString().then((v) => setVersion(v));
  }, []);

  const onLogin = (handler: any) => {
    if (!handler['email'] || !handler['password']) {
      toast.error('Please fill all the fields.');
      return;
    }

    if (errors['email'] || errors['password']) {
      toast.error('Please fill all the fields.');
      return;
    }

    console.log({ variables: { email: handler['email'], password: handler['password'] } });

    loginQuery({ variables: { email: handler['email'], password: handler['password'] } }).then((res) => {
      if (res.data) {
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

  console.log(errors);

  return (
    <div className="animate__animated animate__fadeIn flex flex-col justify-between items-center w-screen h-full bg-content mt-8 pb-4">
      <div>
        <img src="/byteslogo.svg" className="w-[120px] mt-8" />
      </div>
      <form onSubmit={handleSubmit(onLogin)} className="flex flex-col w-[500px]">
        <h1 className="text-2xl">Welcome Back</h1>
        <p className="text-sm mt-4 mb-12 opacity-70">Sign in to your account</p>

        <p className="mb-4 opacity-50 text-md">Email</p>
        <input
          type="email"
          required
          {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
          className={`text-sm w-full p-3 rounded-md border transition-all bg-sidebar outline-none max-w-[500px] ${
            errors['email'] ? 'border-error focus:border-error' : 'border-light-border focus:border-gray-400'
          }`}
          style={{
            backgroundColor: 'var(--sidebar-bg)',
          }}
          placeholder="you@example.com"
        />
        {errors['email'] && (
          <>
            {errors['email'].type === 'required' && <p className="text-xs text-error mt-4">Email is required.</p>}
            {errors['email'].type === 'pattern' && <p className="text-xs text-error mt-4">Email must be valid.</p>}
          </>
        )}

        <div className="flex justify-between items-center mb-4 mt-8">
          <p className="opacity-50 text-md">Password</p>
          {/* <p onClick={() => setMethod('FORGOT_PASSWORD')} className="transition-all cursor-pointer hover:opacity-50">
            Forgot Password?
          </p> */}
        </div>
        <input
          style={{
            backgroundColor: 'var(--sidebar-bg)',
          }}
          required
          type="password"
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
        {loginQueryResult.loading ? (
          <LineWave color="white" wrapperStyle={{ margin: '0 auto' }} />
        ) : (
          <button type="submit" className="mt-8 bg-success p-2 rounded-md transition-all hover:opacity-50">
            Sign In
          </button>
        )}
        <p className="mt-8 text-center">
          <span className="opacity-50">Don't have an account?</span>{' '}
          <span
            className="underline cursor-pointer transition-all hover:text-yellow-500"
            onClick={() => setMethod('REGISTER')}
          >
            Sign Up Now
          </span>
        </p>
        <p className="opacity-50 mt-12 text-xs leading-loose text-center">
          By continuing, you agree to Bytes Browser's Terms of Service and Privacy Policy, and to receive potential
          periodic emails with updates.
        </p>
      </form>
      <div className="mb-4 opacity-20 text-xs">
        <p>{version}</p>
      </div>
    </div>
  );
};
