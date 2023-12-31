/** @type {import('tailwindcss').Config} */
import defaultColors from "tailwindcss/colors";

const colors = {
  gunmetal: "#132D2F",
  "french-gray": "#BDBABF",
  "cadet-gray": "#8E9AA9",
  "rose-quartz": "#AA9897",
  "gunmetal-2": "#062528",
};

export const content = [
  "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
];

export const theme = {
  colors: {
    ...defaultColors,
    ...colors,
  },
  extend: {
    backgroundImage: {
      "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      "gradient-conic":
        "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      "logo-gradient":
        "linear-gradient(105deg, hsl(186deg 43% 13%) 0%, hsl(192deg 35% 17%) 7%, hsl(197deg 28% 21%) 14%, hsl(203deg 22% 25%) 21%, hsl(210deg 17% 29%) 29%, hsl(218deg 13% 32%) 36%, hsl(230deg 9% 36%) 43%, hsl(249deg 7% 40%) 50%, hsl(270deg 6% 42%) 57%, hsl(294deg 5% 45%) 64%, hsl(318deg 5% 49%) 71%, hsl(333deg 6% 52%) 79%, hsl(344deg 8% 56%) 86%, hsl(354deg 8% 60%) 93%, hsl(3deg 10% 63%) 100%)",
    },
    fontFamily: {
      logo: ['"Fredericka The Great", serif'],
      montserrat: ['"Montserrat", "Poppins", sans-serif'],
      poppins: ['"Poppins", "Montserrat", sans-serif'],
      noto: ['"Noto Sans", sans-serif'],
      rale: ['"Raleway", serif'],
    },
  },
};
export const plugins = [];
