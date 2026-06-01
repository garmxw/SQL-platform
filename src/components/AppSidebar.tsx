"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  FileCode2,
  User2,
  Home,
  Trophy,
  BookOpen,
  Code2,
  BadgeCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import VornLight from "../../public/vorn_dark.svg";
import VornDark from "../../public/vorn_light.svg";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Shadcn Tooltip
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Nav configs

const adminNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Content", url: "/dashboard/content", icon: FileCode2 },
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Profile", url: "/dashboard/profile", icon: User2 },
];

const userNav = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Problems", url: "/learning/problems", icon: Code2 },
  { title: "Tracks & Lessons", url: "/learning/tracks", icon: BookOpen },
  { title: "Profile", url: "/profile", icon: User2 },
];

// Nav item with Tooltip

function NavItem({
  item,
  isActive,
}: {
  item: { title: string; url: string; icon: React.ElementType };
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem className="relative">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn("transition-colors", isActive && "font-medium")}
            >
              <Link href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="text-xs">
            {item.title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isActive && (
        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
      )}
    </SidebarMenuItem>
  );
}

// Main

function AppSidebar() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsAdmin(window.location.hostname.startsWith("admin."));
  }, []);

  if (isAdmin === null) {
    return (
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader className="py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg">
                <Link href="/">
                  <Image
                    src={VornDark}
                    alt="Vorn"
                    width={30}
                    height={30}
                    className="w-8 h-auto dark:hidden shrink-0"
                  />
                  <Image
                    src={VornLight}
                    alt="Vorn"
                    width={30}
                    height={30}
                    className="w-8 h-auto hidden dark:block shrink-0"
                  />
                  <span className="text-lg font-extrabold tracking-tight">
                    Vorn
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      </Sidebar>
    );
  }

  const navItems = isAdmin ? adminNav : userNav;

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href={isAdmin ? "/dashboard" : "/home"}>
                <Image
                  src={VornDark}
                  alt="Vorn"
                  width={30}
                  height={30}
                  className="w-8 h-auto dark:hidden shrink-0"
                />
                <Image
                  src={VornLight}
                  alt="Vorn"
                  width={30}
                  height={30}
                  className="w-8 h-auto hidden dark:block shrink-0"
                />
                <span className="text-lg font-extrabold tracking-tight">
                  Vorn
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isAdmin ? "Admin" : "Navigate"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  isActive={
                    item.url === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.url)
                  }
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
