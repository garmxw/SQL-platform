"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Moon, Sun } from "lucide-react";
import VornLight from "../../public/vorn_dark.svg";
import VornDark from "../../public/vorn_light.svg";
import AuthBackgroundShape from "@/components/auth-backgroundShape";
import TwoFactorAuthenticationForm from "@/components/Two-factor-auth-form";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

const TwoFactorAuthentication = () => {
  const { setTheme } = useTheme();
  return (
    <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute">
        <AuthBackgroundShape />
      </div>

      <Card className="z-1 w-full border-none shadow-md sm:max-w-md">
        <CardHeader className="gap-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <Image
                src={VornDark}
                alt="Vorn logo"
                width={30}
                height={30}
                className="w-10 h-auto dark:hidden"
              />
              <Image
                src={VornLight}
                alt="Vorn logo"
                width={30}
                height={30}
                className="w-10 h-auto hidden dark:block"
              />
              <span className="text-lg font-extrabold inline-block transform scale-x-140 origin-left">
                Vorn
              </span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full hover:cursor-pointer"
                >
                  <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <CardTitle className="mb-1.5 text-2xl">
              Two Factor Authentication
            </CardTitle>
            <CardDescription className="text-base">
              Please confirm access to your account by entering the code
              provided by your authenticator application
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* TwoFactorAuthentication Form */}
          <TwoFactorAuthenticationForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default TwoFactorAuthentication;
