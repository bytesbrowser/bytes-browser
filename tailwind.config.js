/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: "#1C1B20",
        body: "#27272D",
        success: "#1db954",
        error: "#ff0000",
        "light-border": "#2E2E33",
      },
    },
  },
  plugins: [],
};
