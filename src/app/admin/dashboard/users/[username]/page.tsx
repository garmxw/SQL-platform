"use client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import CardList from "@/components/CardList";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BadgeCheck, Candy, Citrus, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import EditUser from "@/components/EditUser";

function SingleUserPage() {
  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/users">Users</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>John Kratos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* container */}
      <div className="mt-4 flex flex-col xl:flex-row gap-8">
        {/* left */}
        <div className="w-full xl:w-1/3 space-y-6">
          {/* user badges container */}
          <div className="bg-primary-foreground p-4 rounded-lg">
            <h1 className="text-xl font-semibold">User badges</h1>
            <div className="flex gap-4 mt-4">
              <HoverCard>
                <HoverCardTrigger>
                  <BadgeCheck
                    size={36}
                    className="rounded-full bg-blue-500/30 border border-blue-500/50 p-2"
                  />
                </HoverCardTrigger>
                <HoverCardContent>
                  <h1 className="font-bold mb-2">Verified User</h1>
                  <p className="text-sm text-muted-foreground">
                    This user has been verified by the admin
                  </p>
                </HoverCardContent>
              </HoverCard>
              <HoverCard>
                <HoverCardTrigger>
                  <Shield
                    size={36}
                    className="rounded-full bg-green-800/30 border border-green-800/50 p-2"
                  />
                </HoverCardTrigger>
                <HoverCardContent>
                  <h1 className="font-bold mb-2">Admin</h1>
                  <p className="text-sm text-muted-foreground">
                    Admin users have access to all features and can manage
                    users.
                  </p>
                </HoverCardContent>
              </HoverCard>
              <HoverCard>
                <HoverCardTrigger>
                  <Candy
                    size={36}
                    className="rounded-full bg-yellow-500/30 border border-yellow-500/50 p-2"
                  />
                </HoverCardTrigger>
                <HoverCardContent>
                  <h1 className="font-bold mb-2">Awarded</h1>
                  <p className="text-sm text-muted-foreground">
                    This user has been awarded to thier contribution
                  </p>
                </HoverCardContent>
              </HoverCard>
              <HoverCard>
                <HoverCardTrigger>
                  <Citrus
                    size={36}
                    className="rounded-full bg-orange-500/30 border border-orange-500/50 p-2"
                  />
                </HoverCardTrigger>
                <HoverCardContent>
                  <h1 className="font-bold mb-2">Popular User</h1>
                  <p className="text-sm text-muted-foreground">
                    This user has been popular in the comunity
                  </p>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>

          {/* information container */}
          <div className="bg-primary-foreground p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">User Information</h1>
              <Sheet>
                <SheetTrigger asChild>
                  <Button>Edit User</Button>
                </SheetTrigger>
                <EditUser />
              </Sheet>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex flex-col gap-2 mb-8">
                <Field className="w-full max-w-sm">
                  <FieldLabel
                    htmlFor="user-progress"
                    className="text-sm text-muted-foreground"
                  >
                    <span>User progress</span>
                    <span className="ml-auto">66%</span>
                  </FieldLabel>
                  <Progress value={66} id="user-progress" className="h-1.5" />
                </Field>
              </div>
              <div className=" flex items-center gap-2">
                <span className="font-bold">Username :</span>
                <span>John Kratos</span>
              </div>
              <div className=" flex items-center gap-2">
                <span className="font-bold">Email :</span>
                <span>JohnKratos@gmail.com</span>
              </div>
              <div className=" flex items-center gap-2">
                <span className="font-bold">Phone :</span>
                <span>+1 253 5248</span>
              </div>
              <div className=" flex items-center gap-2">
                <span className="font-bold">Location :</span>
                <span>New York, NY</span>
              </div>
              <div className=" flex items-center gap-2">
                <span className="font-bold">Role :</span>
                <Badge>Admin</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Joined on 2025.02.02
            </p>
          </div>

          {/* Cart list container */}
          <div className="bg-primary-foreground p-4 rounded-lg">
            <CardList title="Recent Transactions" />
          </div>
        </div>

        {/* right */}
        <div className="w-full xl:w-2/3 space-y-6">
          {/* user card container */}
          <div className="bg-primary-foreground p-4 rounded-lg">User Card</div>
          {/* chart container */}
          <div className="bg-primary-foreground p-4 rounded-lg">User Chart</div>
        </div>
      </div>
    </div>
  );
}

export default SingleUserPage;
