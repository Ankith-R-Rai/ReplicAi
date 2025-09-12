// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#2563eb',   // Royal Blue (for primary actions, glows)
        'accent': '#10b981',    // Emerald Green (for success states, highlights)
        'highlight': '#f59e0b', // Amber/Orange
        'background': '#0a0a0a', // Near-black background
        'surface': '#1a1a1a',   // Slightly lighter for cards/surfaces
        'foreground': '#f8f8f8', // Off-white for text
        'subtle': '#888888',    // Gray for less important text
      }
    },
  },
  plugins: [],
}