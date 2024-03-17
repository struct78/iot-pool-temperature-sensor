import "~/styles/globals.css";
import { Inconsolata } from "next/font/google";

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["200", "400"]
});

export const metadata = {
  title: "Can we go in the pool?",
  description: "A simple app to check if it's warm enough to go in the pool in Melbourne",
  icons: [{ rel: "icon", url: "/favicon.svg" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inconsolata.variable}`}>{children}</body>
    </html>
  );
}
