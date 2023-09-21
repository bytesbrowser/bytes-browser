import { useState } from 'react';
import ReactModal from 'react-modal';
import Select from 'react-select';

export const CommandBuilderModal = ({ show, setShow }: { show: boolean; setShow: (show: boolean) => void }) => {
  const [commandName, setCommandName] = useState<string>('');

  return (
    <ReactModal
      isOpen={show}
      onRequestClose={() => {
        setShow(false);
      }}
      style={{
        content: {
          background: 'radial-gradient(circle, rgba(28,27,32,0.9) 0%, rgba(25,25,24,1) 100%)',
          border: 'none',
          padding: 0,
          width: '60%',
          height: 'min-content',
          margin: 'auto',
          borderRadius: '12px',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <div className="animate__animated animate__fadeIn animate__faster pb-8 pt-4">
        <div className="top p-4">
          <p className="text-lg">Command Builder</p>
          <div className="builder flex items-center justify-between mt-4">
            <p>DO</p>
            <input
              value={commandName}
              onChange={(e) => {
                setCommandName(e.target.value);
              }}
              type="text"
              placeholder="Command Name"
              className="flex-1 mx-4 p-1 rounded-md text-center"
              style={{
                backgroundColor: 'var(--sidebar-inset-bg)',
              }}
            />
            <p>EVERY</p>
            <input
              type="number"
              placeholder="3000"
              className="flex-1 mx-4 p-1 rounded-md text-center"
              style={{
                backgroundColor: 'var(--sidebar-inset-bg)',
              }}
            />
            <Select
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
                { value: 'Seconds', label: 'Seconds' },
                { value: 'Milliseconds', label: 'Milliseconds' },
                { value: 'Minutes', label: 'Minutes' },
              ]}
              onChange={(e) => {}}
            />
          </div>
        </div>
        {commandName && (
          <div
            className="bottom"
            style={{
              backgroundColor: 'var(--sidebar-inset-bg)',
            }}
          >
            {commandName}
          </div>
        )}
      </div>
    </ReactModal>
  );
};
