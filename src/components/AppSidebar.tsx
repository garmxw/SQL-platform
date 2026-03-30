"use client";

import {
  Inbox,
  Home,
  Calendar,
  Search,
  Settings,
  User2,
  Plus,
  History,
  NotebookPen,
  Projector,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import VornLight from "../../public/vorn_dark.svg";
import VornDark from "../../public/vorn_light.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Inbox", url: "#", icon: Inbox, badge: "24" }, // ✅ badge in data
  { title: "Calendar", url: "#", icon: Calendar },
  { title: "Search", url: "#", icon: Search },
  { title: "Settings", url: "#", icon: Settings },
];

// Separate list for Help section — no badges
const helpItems = items.map(({ badge, ...rest }) => rest);

function AppSidebar() {
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
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
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Application ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Projects ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            {" "}
            {/* ✅ was missing */}
            <SidebarMenu>
              {" "}
              {/* ✅ was missing */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="#">
                    <NotebookPen />
                    <span>Notes</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuAction>
                  <Plus />
                  <span className="sr-only">Add a Note</span>
                </SidebarMenuAction>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="#">
                    <Projector />
                    <span>Add a project</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuAction>
                  <Plus />
                  <span className="sr-only">Add a Project</span>
                </SidebarMenuAction>
              </SidebarMenuItem>
            </SidebarMenu>{" "}
            {/* ✅ was missing */}
          </SidebarGroupContent>{" "}
          {/* ✅ was missing */}
        </SidebarGroup>

        {/* ── Help (collapsible) ── */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                Help
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {helpItems.map(
                    (
                      item, // ✅ use helpItems — no badges
                    ) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* ── Nested sidebar ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Notes</SidebarGroupLabel>
          <SidebarGroupContent>
            {" "}
            {/* ✅ was missing */}
            <SidebarMenu>
              {" "}
              {/* ✅ was missing */}
              <Collapsible>
                {" "}
                {/* ✅ SubMenu needs Collapsible */}
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton asChild>
                      <Link href="#">
                        <NotebookPen />
                        <span>Notes</span>
                      </Link>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="#">
                            <History />
                            <span>Recent</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="#">
                    <Projector />
                    <span>Add a project</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuAction>
                  <Plus />
                  <span className="sr-only">Add a Project</span>
                </SidebarMenuAction>
              </SidebarMenuItem>
            </SidebarMenu>{" "}
            {/* ✅ was missing */}
          </SidebarGroupContent>{" "}
          {/* ✅ was missing */}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> John kratos <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32" sideOffset={10}>
                <DropdownMenuItem>Account</DropdownMenuItem>
                <DropdownMenuItem>Setting</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
