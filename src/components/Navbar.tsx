"use client";

import { useTheme } from "next-themes";
import {
  LogOut,
  Moon,
  Sun,
  Settings,
  User,
  Users,
  Loader2,
  Monitor,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { SidebarTrigger } from "./ui/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DynamicBreadcrumbs } from "./DynamicBreadcrumbs";
import { Separator } from "./ui/separator";

const Navbar = () => {
  const { setTheme } = useTheme();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [userData, setUserData] = useState({
    avatar_url: "",
    display_name: "",
  });

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const res = await fetch("/api/profile/get-UserAvatar", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const result = await res.json();
          setUserData({
            avatar_url: result.data?.avatar_url || "",
            display_name: result.data?.display_name || "",
          });
        }
      } catch (error) {
        console.error("HTTP Request Error:", error);
      }
    };

    // 1. Initial fetch
    fetchAvatar();

    // 2. Listen for the custom event
    window.addEventListener("profileUpdate", fetchAvatar);

    // 3. Cleanup listener on unmount
    return () => window.removeEventListener("profileUpdate", fetchAvatar);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.trim().substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Could not reach the server.");

      toast.success("Successfully logged out");
      const isAdmin = window.location.hostname.startsWith("admin.");
      const redirectPath = isAdmin ? "/login" : "/";

      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    } finally {
      setIsLoading(false);
      setShowLogoutDialog(false);
    }
  };

  return (
    <nav className="flex px-4 py-3 items-center justify-between border-b bg-background/60 backdrop-blur-md sticky top-0 z-50">
      {/* LEFT SIDE - Now properly responsive */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Sidebar trigger + separator group (never shrinks) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <SidebarTrigger variant="ghost" size="icon" className="-ml-1" />
          <Separator
            orientation="vertical"
            className="h-8" /* Fixed height + removed mr-2 for cleaner spacing */
          />
        </div>

        {/* Breadcrumbs - now constrained so they shrink instead of breaking layout */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <DynamicBreadcrumbs />
        </div>
      </div>

      {/* RIGHT SIDE - Always visible, never shrinks */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* THEME TOGGLE MENU */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full cursor-pointer"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* USER PROFILE MENU */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:cursor-pointer"
            >
              <Avatar>
                <AvatarImage
                  src={userData.avatar_url}
                  alt={userData.display_name}
                />
                <AvatarFallback className="bg-primary/10">
                  {getInitials(userData.display_name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" sideOffset={10}>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer">
                <User className="h-[1.2rem] w-[1.2rem] mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Users className="h-[1.2rem] w-[1.2rem] mr-2" />
                Team
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="h-[1.2rem] w-[1.2rem] mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                setShowLogoutDialog(true);
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-[1.2rem] w-[1.2rem] mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* LOGOUT DIALOG */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Your active session will be ended. You will need to log back in
                to access your data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </nav>
  );
};

export default Navbar;
