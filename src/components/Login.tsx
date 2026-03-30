"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import VornLight from "../../public/vorn_dark.svg";
import VornDark from "../../public/vorn_light.svg";
import AuthBackgroundShape from "./AuthBackground";
import LoginForm from "./Login-form";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const Login = () => {
  const { setTheme } = useTheme();
  return (
    <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute">
        <AuthBackgroundShape />
      </div>

      <Card className="z-1 w-full border-none shadow-md sm:max-w-lg">
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
              Sign in to Shadcn Studio
            </CardTitle>
            <CardDescription className="text-base">
              Focus on growth by learning faster.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Login Form */}
          <div className="space-y-4">
            <LoginForm />

            <p className="text-muted-foreground text-center">
              New on our platform?{" "}
              <a
                href="/signup"
                className="text-card-foreground hover:underline"
              >
                Create an account
              </a>
            </p>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <p>or</p>
              <Separator className="flex-1" />
            </div>

            <Button variant="ghost" className="w-full" asChild>
              <a href="#">Sign in with google</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
