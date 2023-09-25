import { useEffect, useState } from 'react';

export const NoInternetFeature = ({ children }: { children: React.ReactNode }) => {
  const [hasNetwork, setHasNetwork] = useState<boolean>(false);

  const checkNetwork = () => {
    setHasNetwork(navigator.onLine);
  };

  useEffect(() => {
    checkNetwork();
    window.addEventListener('online', checkNetwork);
    window.addEventListener('offline', checkNetwork);

    return () => {
      window.removeEventListener('online', checkNetwork);
      window.removeEventListener('offline', checkNetwork);
    };
  }, []);

  if (hasNetwork) {
    return <>{children}</>;
  }

  return (
    <div
      className="rounded-md p-4 justify-center items-center flex flex-col animate__animated animate__fadeIn"
      style={{
        backgroundColor: 'var(--sidebar-inset-bg)',
      }}
    >
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="16" r="2" fill="white" />
          <path
            fill="white"
            d="M16.4 11.6A7.1 7.1 0 0 0 12 9.1l3.4 3.4zM19 8.4A12.2 14 0 0 0 8.2 4.2L10 6a9.9 9.9 0 0 1 7.4 3.7zM3.5 2L2 3.4l2.2 2.2A13.1 13.1 0 0 0 1 8.4l1.5 1.3a10.7 10.7 0 0 1 3.2-2.6L8 9.3a7.3 7.3 0 0 0-3.3 2.3L6.1 13a5.2 5.2 0 0 1 3.6-2l6.8 7l1.5-1.5z"
          />
        </svg>
        <p className="text-white ml-2">This feature requires internet access.</p>
      </div>
      <button
        onClick={checkNetwork}
        className="mt-8 border p-2 px-8 rounded transition-all cursor-pointer hover:opacity-50 text-xs"
      >
        Refresh
      </button>
    </div>
  );
};
