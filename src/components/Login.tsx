import { Dispatch, FormEvent, SetStateAction, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LineWave } from 'react-loader-spinner';

import { useLoginLazyQuery } from '../graphql';
import { is_email } from '../lib/utils/formChecker';
import { getVersionString } from '../lib/utils/getVersion';

export const Login = ({
  setMethod,
  onTokenReceived,
}: {
  setMethod: Dispatch<SetStateAction<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>>;
  onTokenReceived: (token: string) => Promise<void>;
}) => {
  const [loginQuery, loginQueryResult] = useLoginLazyQuery();
  const [form, setForm] = useState({ email: { value: '', valid: true }, password: { value: '', valid: true } });
  const [version, setVersion] = useState('');

  useEffect(() => {
    getVersionString().then((v) => setVersion(v));
  }, []);

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

  const onLogin = (e: FormEvent) => {
    e.preventDefault();

    if (!form.email.value || !form.password.value) {
      return;
    }

    if (!is_email(form.email.value) || form.password.value.length < 5) {
      return;
    }

    loginQuery({ variables: { email: form.email.value, password: form.password.value } }).then((res) => {
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

  return (
    <div className="animate__animated animate__fadeIn flex flex-col justify-between items-center w-screen h-full bg-content mt-8 pb-4">
      <div>
        <img src="/byteslogo.svg" className="w-[120px]" />
      </div>
      <form onSubmit={onLogin} className="flex flex-col w-[500px]">
        <h1 className="text-2xl">Welcome Back</h1>
        <p className="text-sm mt-4 mb-12 opacity-70">Sign in to your account</p>

        <p className="mb-4 opacity-50 text-md">Email</p>
        <input
          type="email"
          required
          className={`text-sm w-full p-3 rounded-md border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px] ${
            !form.email.valid && 'border-error focus:border-error'
          }`}
          style={{
            backgroundColor: 'var(--sidebar-bg)',
          }}
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
          <p onClick={() => setMethod('FORGOT_PASSWORD')} className="transition-all cursor-pointer hover:opacity-50">
            Forgot Password?
          </p>
        </div>
        <input
          style={{
            backgroundColor: 'var(--sidebar-bg)',
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
        {!form.password.valid && <p className="text-xs text-error mt-4">Password must be at least 5 characters.</p>}
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
