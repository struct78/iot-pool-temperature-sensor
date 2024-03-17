import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    colors: {
      white: "#FFF",
      black: "#000",
      blue: "#0096FF",
      orange: "#FFAC1C",
      green: "#50C878",
    },
    fontSize: {
      xxs: "0.8rem",
      xs: "1rem",
      sm: "6rem",
      md: "7rem",
      lg: "12rem",
      xl: "20rem",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
    },
  },
  plugins: [],
} satisfies Config;
