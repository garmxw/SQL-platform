import "./globals.css";
import { Inter, Geist } from "next/font/google";
import { cn } from "#/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], weight: "400" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body
        className={`${inter.className} bg-slate-950 text-white antialiased`}
      >
        {/* You can add a shared Navbar here later */}
        {children}
      </body>
    </html>
  );
}
