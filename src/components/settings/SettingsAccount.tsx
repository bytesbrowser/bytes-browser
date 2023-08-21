import Moment from "react-moment";

export const SettingsAccount = () => {
  return (
    <>
      <p className="text-xs opacity-50 mb-8">
        Account Created{" "}
        <Moment date={new Date("2023-08-10T05:58:40.019Z")} fromNow />
      </p>

      <p className="text-xs opacity-50 mb-8">
        Last Updated{" "}
        <Moment date={new Date("2023-08-20T15:58:40.020Z")} fromNow />
      </p>

      <p className="mb-4 opacity-50 text-md">Full Name</p>
      <input
        type="text"
        placeholder="John Doe"
        className="text-sm w-full p-2 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />

      <p className="mb-4 opacity-50 text-md mt-8">Email Address</p>
      <input
        type="email"
        placeholder="johndoe@bytesbrowser.com"
        className="text-sm w-full p-2 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />

      <p className="mb-4 opacity-50 text-md mt-8">Change Password </p>
      <input
        type="password"
        placeholder="*********"
        className="text-sm w-full p-2 rounded-md bg-sidebar border border-light-border transition-all outline-none focus:border-gray-400 max-w-[500px]"
      />

      <p className="mb-4 text-sm mt-10 bg-success w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all">
        Save Changes
      </p>
      <p className="mb-4 text-sm mt-10 bg-error w-[150px] p-2 rounded-md text-center cursor-pointer hover:opacity-80 transition-all">
        Close Account
      </p>
    </>
  );
};
