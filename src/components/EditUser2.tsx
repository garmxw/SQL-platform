"use client";
//this file just for testing and fixing errors
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

  email: z.email("Invalid Email"),

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

      classNames: {
        content: "flex flex-col gap-2",
      },

      style: {
        "--border-radius": "calc(var(--radius)  + 4px)",
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
    <>
           {" "}
      <SheetContent>
               {" "}
        <SheetHeader>
                    <SheetTitle className="mb-4">Edit User</SheetTitle>         {" "}
          <SheetDescription>
                       {" "}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 ">
                           {" "}
              <FieldGroup>
                               {" "}
                <Controller
                  name="username"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                                           {" "}
                      <FieldLabel htmlFor="form-rhf-demo-username">
                                                Username                    
                         {" "}
                      </FieldLabel>
                                           {" "}
                      <Input
                        {...field}
                        id="form-rhf-demo-username"
                        aria-invalid={fieldState.invalid}
                        placeholder="Enter the username"
                        autoComplete="off"
                      />
                                           {" "}
                      <FieldDescription>
                                                Username must be between 2-32
                        characters.                      {" "}
                      </FieldDescription>
                                           {" "}
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </>
  );
}

export default EditUser;
