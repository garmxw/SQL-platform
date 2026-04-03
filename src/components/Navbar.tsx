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
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
import { useState } from "react";

const Navbar = () => {
  const { setTheme } = useTheme();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/auth/logout", {
        // ← CHANGED: relative path
        method: "POST",
        credentials: "include", // already good
      });

      if (!response.ok) throw new Error("Could not reach the server.");

      toast.success("Successfully logged out");

      // Redirect logic (already correct)
      const isAdmin = window.location.hostname.startsWith("admin.");
      const redirectPath = isAdmin ? "/login" : "/";

      // Optional: hard redirect to be 100% sure cookie is cleared
      // window.location.href = redirectPath;
      router.push(redirectPath); // you can keep this if you prefer soft nav
      router.refresh();
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    } finally {
      setIsLoading(false);
      setShowLogoutDialog(false);
    }
  };

  return (
    <nav className="flex p-4 items-center justify-between">
      {/* LEFT */}
      <SidebarTrigger variant={"ghost"} size={"icon-lg"} />

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {/*Link*/}
        <Link href={"/"}>Dashboard</Link>
        {/*theme menu*/}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:cursor-pointer"
            >
              <Avatar>
                <AvatarImage
                  src="https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_13.png"
                  alt="avatar"
                />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" sideOffset={10}>
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
            <DropdownMenuGroup>
              {/* onSelect with preventDefault keeps the UI from glitching before the dialog opens */}
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowLogoutDialog(true);
                }}
                className="cursor-pointer"
              >
                <LogOut className="h-[1.2rem] w-[1.2rem] mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Confirmation Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to log out?
              </AlertDialogTitle>
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
