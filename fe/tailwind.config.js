/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: {
          blue: "#38bdf8",
          red: "#f43f5e"
        }
      }
    }
  },
  plugins: []
};
