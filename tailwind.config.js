/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#4F46E5", light: "#6366F1", dark: "#4338CA" },
        risk: { low: "#10B981", medium: "#F59E0B", high: "#EF4444", critical: "#7C3AED" },
      },
    },
  },
  plugins: [],
}