"use client";

import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./ui/field";
import { Input } from "./ui/input";

const formSchema = z.object({
  username: z
    .string()
    .min(2, "Username must be at least 2 characters.")
    .max(32, "Username must be at most 32 characters."),
  email: z.string().email("Invalid Email"),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 characters.")
    .max(50, "Phone must be at most 50 characters."),
  location: z.string().min(2, "Location must be at least 2 characters."),
  role: z.enum(["admin", "user"]),
});

function EditUser() {
  function onSubmit(data: z.infer<typeof formSchema>) {
    toast("You submitted the following values:", {
      description: (
        <pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
      position: "bottom-right",
      classNames: { content: "flex flex-col gap-2" },
      style: {
        "--border-radius": "calc(var(--radius) + 4px)",
      } as React.CSSProperties,
    });
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "John Kratos",
      email: "johnkratos@gmail.com",
      phone: "+1 253 5248",
      location: "New York, NY",
      role: "admin",
    },
  });

  return (
    <SheetContent className="px-6 py-6 overflow-y-auto">
      {" "}
      {/* ✅ padding so content doesn't touch the sheet edge */}
      <SheetHeader className="mb-6">
        <SheetTitle>Edit User</SheetTitle>
        <SheetDescription>
          Update the user&apos;s details below.
        </SheetDescription>
      </SheetHeader>
      {/* ✅ form is now OUTSIDE SheetDescription — was causing hydration error (<form> inside <p>) */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          {/* Username */}
          <Controller
            name="username"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-username">Username</FieldLabel>
                <Input
                  {...field}
                  id="field-username"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter the username"
                  autoComplete="off"
                />
                <FieldDescription>
                  Username must be between 2–32 characters.
                </FieldDescription>
                {fieldState.invalid && <FieldError />}
              </Field>
            )}
          />

          {/* Email */}
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="field-email"
                  type="email"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter the email"
                  autoComplete="off"
                />
                <FieldDescription>
                  Must be a valid email address.
                </FieldDescription>
                {fieldState.invalid && <FieldError />}
              </Field>
            )}
          />

          {/* Phone */}
          <Controller
            name="phone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-phone">Phone</FieldLabel>
                <Input
                  {...field}
                  id="field-phone"
                  type="tel"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter the phone number"
                  autoComplete="off"
                />
                <FieldDescription>
                  Phone must be between 10–50 characters.
                </FieldDescription>
                {fieldState.invalid && <FieldError />}
              </Field>
            )}
          />

          {/* Location */}
          <Controller
            name="location"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-location">Location</FieldLabel>
                <Input
                  {...field}
                  id="field-location"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter the location"
                  autoComplete="off"
                />
                <FieldDescription>
                  City and state, e.g. New York, NY.
                </FieldDescription>
                {fieldState.invalid && <FieldError />}
              </Field>
            )}
          />

          {/* Role */}
          <Controller
            name="role"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-role">Role</FieldLabel>
                <Input
                  {...field}
                  id="field-role"
                  aria-invalid={fieldState.invalid}
                  placeholder="admin or user"
                  autoComplete="off"
                />
                <FieldDescription>
                  Must be either &quot;admin&quot; or &quot;user&quot;.
                </FieldDescription>
                {fieldState.invalid && <FieldError />}
              </Field>
            )}
          />
        </FieldGroup>

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save changes
        </button>
      </form>
    </SheetContent>
  );
}

export default EditUser;
