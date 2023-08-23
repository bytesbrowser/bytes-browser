import Toggle from 'react-toggle';

export const SettingsPerformance = () => {
  return (
    <div className="flex flex-col">
      <div className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 border-white mt-4">
        <p className="text-sm">Enable background caching</p>
        <Toggle defaultChecked={true} icons={false} />
      </div>
      <div className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 border-white mt-12">
        <p className="text-sm">Automatically delete cache files</p>
        <Toggle defaultChecked={true} icons={false} />
      </div>
      <div className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 border-white mt-12">
        <p className="text-sm">Calculate unused or uneeded files in the background</p>
        <Toggle defaultChecked={true} icons={false} />
      </div>
      <p className="mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all">
        Clear App Cache
      </p>
      <p className="mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all">
        Reset App Data
      </p>
    </div>
  );
};
