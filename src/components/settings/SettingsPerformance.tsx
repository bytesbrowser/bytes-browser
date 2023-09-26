import { useState } from 'react';
import Select from 'react-select';
import Toggle from 'react-toggle';

export const SettingsPerformance = () => {
  const [commandBuilderType, setCommandBuilderType] = useState<{ value: string; label: string } | null>({
    value: 'Shell',
    label: 'Default Shell',
  });

  return (
    <div
      className="rounded-md p-4 justify-center items-center flex flex-col animate__animated animate__fadeIn"
      style={{
        backgroundColor: 'var(--sidebar-inset-bg)',
      }}
    >
      <div className="flex items-center">
        <p className="text-white ml-2">This feature is still being developed. Please check again at a later update.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <div
        className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 mt-4"
        style={{
          borderColor: 'var(--sidebar-border-color)',
        }}
      >
        <p className="text-sm">Show hidden files by default</p>
        <Toggle defaultChecked={true} icons={false} />
      </div>
      <div
        className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 mt-12"
        style={{
          borderColor: 'var(--sidebar-border-color)',
        }}
      >
        <p className="text-sm">Default Command Builder</p>
        <Select
          value={commandBuilderType}
          styles={{
            option: (styles) => ({
              ...styles,
              color: '#FFFFFF',
              backgroundColor: '#1C1B20',
              '&:hover': {
                backgroundColor: '#27272D',
              },
              fontSize: '12px',
            }),
            container: (styles) => ({
              ...styles,
              width: '200px',
              backgroundColor: '#1C1B20',
              fontSize: '12px',
            }),
            control: (styles) => ({
              ...styles,
              backgroundColor: '#1C1B20',
              borderColor: '#27272D',
            }),
            singleValue: (styles) => ({
              ...styles,
              color: '#FFFFFF',
            }),
            menu: (styles) => ({
              ...styles,
              backgroundColor: '#1C1B20',
            }),
          }}
          options={[
            { value: 'Bash', label: 'Bash' },
            { value: 'Shell', label: 'Default Shell' },
          ]}
          onChange={(e) => {
            setCommandBuilderType(e);
          }}
        />
      </div>
      <div
        className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 mt-12"
        style={{
          borderColor: 'var(--sidebar-border-color)',
        }}
      >
        <p className="text-sm">Send Crash Reports</p>
        <Toggle defaultChecked={true} icons={false} />
      </div>

      <div
        className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 mt-12"
        style={{
          borderColor: 'var(--sidebar-border-color)',
        }}
      >
        <p className="text-sm">Enable background caching</p>
        <Toggle defaultChecked={true} icons={false} />
      </div>
      <div
        style={{
          borderColor: 'var(--sidebar-border-color)',
        }}
        className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 border-white mt-12"
      >
        <p className="text-sm">Automatically delete cache files</p>
        <Toggle defaultChecked={true} icons={false} />
      </div>
      <div
        style={{
          borderColor: 'var(--sidebar-border-color)',
        }}
        className="item flex items-center justify-between max-w-[650px] pb-4 border-b border-opacity-10 border-white mt-12"
      >
        <p className="text-sm">Calculate unused or uneeded files in the background</p>
        <Toggle defaultChecked={true} icons={false} />
      </div>
      <p
        style={{
          color: 'var(--sidebar-inset-text-color)',
        }}
        className="mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all"
      >
        Clear App Cache
      </p>
      <p
        style={{
          color: 'var(--sidebar-inset-text-color)',
        }}
        className="mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all"
      >
        Reset App Data
      </p>
    </div>
  );
};
