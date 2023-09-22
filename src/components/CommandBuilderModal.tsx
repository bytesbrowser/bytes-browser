import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ReactModal from 'react-modal';
import Select from 'react-select';

export const CommandBuilderModal = ({ show, setShow }: { show: boolean; setShow: (show: boolean) => void }) => {
  const [commandName, setCommandName] = useState<string>('');
  const [addingCommand, setAddingCommand] = useState<string | null>(null);
  const [commands, setCommands] = useState<string[]>([]);
  const [timeType, setTimeType] = useState({ value: 'Seconds', label: 'Seconds' });
  const [time, setTime] = useState<number>(30);

  useEffect(() => {
    setCommandName('');
    setCommands([]);
    setAddingCommand(null);
  }, []);

  const onFinish = () => {
    setCommandName('');
    setCommands([]);
    setAddingCommand(null);

    setShow(false);
    toast.success(
      commandName + " command created! You can now use it in the 'Commands' tab, or wait for it to run automatically.",
    );
  };

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
      <div className="animate__animated animate__fadeIn animate__faster pt-4">
        <div className={`top p-4 ${(!commandName || !timeType || !time) && ' h-[200px]'}`}>
          <p className="text-lg">Command Builder</p>
          <div className="builder flex items-center justify-between mt-4">
            <p>DO</p>
            <input
              value={commandName}
              onChange={(e) => {
                const commandName = e.target.value.replace(/\s+/g, '-').toLowerCase();
                setCommandName(commandName);
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
              value={timeType}
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
              onChange={(e) => {
                setTimeType(e as any);
              }}
            />
          </div>
        </div>
        {(!commandName || !timeType || !time) && (
          <p className="text-center pb-8 text-xs opacity-50">
            Must enter the command's basic information before proceeding.
          </p>
        )}
        {commandName && (
          <div
            className="bottom h-full w-full p-4"
            style={{
              backgroundColor: 'var(--sidebar-inset-bg)',
            }}
          >
            <p className="font-bold text-yellow-600 text-sm opacity-80">{commandName.toUpperCase()}:</p>
            {commands.map((command, index) => (
              <p key={index} className="ml-12 font-mono">
                {index}: <span className="font-mono opacity-80">{command}</span>
              </p>
            ))}
            {addingCommand !== null && (
              <div className="flex items-center">
                <input
                  value={addingCommand}
                  onChange={(e) => {
                    setAddingCommand(e.target.value);
                  }}
                  className="pl-4 font-mono ml-12 my-2 rounded-md p-1 w-3/4 text-sm bg-transparent border border-gray-500 outline-none focus:border-white transition-all"
                  type="text"
                  placeholder="cp -r . ../home"
                />

                <button
                  onClick={() => {
                    console.log(commands);
                    setCommands([...commands, addingCommand]);
                    setAddingCommand(null);
                  }}
                  className="ml-4 hover:opacity-50 transition-all mr-2"
                >
                  {' '}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20">
                    <path
                      fill="var(--icon-color)"
                      d="M11 9V5H9v4H5v2h4v4h2v-4h4V9h-4zm-1 11a10 10 0 1 1 0-20a10 10 0 0 1 0 20z"
                    />
                  </svg>
                </button>
                <button
                  className="hover:opacity-50 transition-all"
                  onClick={() => {
                    setAddingCommand(null);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                    <path
                      fill="red"
                      d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17Zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Z"
                    />
                  </svg>
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setAddingCommand('');
              }}
              className="flex items-center ml-12 my-2 px-3 py-2 rounded-md hover:opacity-50 transition-all text-sm"
              style={{
                backgroundColor: 'var(--primary-bg)',
              }}
            >
              <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20">
                <path
                  fill="var(--icon-color)"
                  d="M11 9V5H9v4H5v2h4v4h2v-4h4V9h-4zm-1 11a10 10 0 1 1 0-20a10 10 0 0 1 0 20z"
                />
              </svg>{' '}
              Add a command
            </button>
            <button
              onClick={onFinish}
              className="flex items-center ml-12 my-2 px-3 py-2 rounded-md hover:opacity-50 transition-all text-sm bg-green-600"
            >
              Finish
            </button>
          </div>
        )}
      </div>
    </ReactModal>
  );
};
