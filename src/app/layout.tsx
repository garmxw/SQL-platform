import "./globals.css";
import { Inter, Geist } from "next/font/google";
import { cn } from "#/lib/utils";
import { ThemeProvider } from "@/components/providers/themeProvider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"], weight: "400" });
import { Sora } from "next/font/google";
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable, sora.variable)}
    >
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
