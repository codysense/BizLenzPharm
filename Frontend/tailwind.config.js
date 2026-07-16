/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lavender: "#e0daed",
        "light-lavender": "#f5f0f7",
        "dark-lavender": "#c9b8d6",
        velvet: "#3b2a60",
        "light-velvet": "#5a3e8c",
        "dark-velvet": "#2a1f40",
        rose: "#e63946",
        "light-rose": "#f28b82",
        "dark-rose": "#a6282a",
        mint: "#2a9d8f",
        "light-mint": "#52b2a4",
        "dark-mint": "#1f6e68",
      },

      fontFamily: {
        brand: ["Choga", "sans-serif"], // 'font-brand' class
      },
    },
    plugins: [],
  },
};
