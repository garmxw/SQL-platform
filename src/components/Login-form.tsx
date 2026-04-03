"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginForm = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter(); // Initialize router
  const [isLoading, setIsLoading] = useState(false);

  // Login method selector
  const [loginMethod, setLoginMethod] = useState<"email" | "username">("email");

  // Form state
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    rememberMe: false,
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Clear error for the current field
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      rememberMe: checked,
    }));
  };

  // Handle login method switch
  const handleMethodChange = (method: "email" | "username") => {
    setLoginMethod(method);
    // Clear identifier error when switching method
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.identifier;
      return updated;
    });
  };

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Identifier validation (email or username depending on method)
    if (!formData.identifier.trim()) {
      newErrors.identifier =
        loginMethod === "email"
          ? "Email address is required"
          : "Username is required";
    } else if (loginMethod === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.identifier)) {
        newErrors.identifier = "Please enter a valid email address";
      }
    } else if (loginMethod === "username") {
      if (formData.identifier.length < 3) {
        newErrors.identifier = "Username must be at least 3 characters";
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    return newErrors;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      console.log("✅ Login successful!", {
        method: loginMethod,
        identifier: formData.identifier,
        rememberMe: formData.rememberMe,
      });
      setIsLoading(true);
      setErrors({});
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      try {
        const response = await fetch("/auth/login", {
          // ← CHANGED: relative path (no apiUrl)
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // ← ADD this (important for cookies)
          body: JSON.stringify({
            method: loginMethod,
            identifier: formData.identifier,
            password: formData.password,
            rememberMe: formData.rememberMe,
          }),
        });

        const data = await response.json();

        if (data.status === "failed") {
          setErrors({ password: data.message });
          return;
        }

        if (!response.ok) {
          setErrors({ general: data.message || "Login failed" });
        } else {
          const hostname = window.location.hostname;
          console.log("Current Hostname:", hostname);

          const redirectPath = window.location.hostname.startsWith("admin.")
            ? "/dashboard"
            : "/home";

          // You can keep router.push (soft navigation works now)
          router.push(redirectPath);
          router.refresh();

          console.log(`Login successful! Redirecting to ${redirectPath}`);
        }
      } catch (err) {
        setErrors({ general: "An unexpected error occurred" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Google login handler (demo)
  const handleGoogleLogin = () => {
    console.log("Google login triggered");
    // TODO: Add your Google OAuth flow here (e.g. NextAuth, Clerk, Supabase, etc.)
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Login method selector - Email or Username */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={loginMethod === "email" ? "default" : "outline"}
          onClick={() => handleMethodChange("email")}
          className="font-medium"
        >
          Login with Email
        </Button>
        <Button
          type="button"
          variant={loginMethod === "username" ? "default" : "outline"}
          onClick={() => handleMethodChange("username")}
          className="font-medium"
        >
          Login with Username
        </Button>
      </div>

      {/* Identifier field (Email or Username) */}
      <div className="space-y-1">
        <Label className="leading-5" htmlFor="identifier">
          {loginMethod === "email" ? "Email address" : "Username"}*
        </Label>
        <Input
          type={loginMethod === "email" ? "email" : "text"}
          id="identifier"
          placeholder={
            loginMethod === "email"
              ? "Enter your email address"
              : "Enter your username"
          }
          value={formData.identifier}
          onChange={handleChange}
        />
        {errors.identifier && (
          <p className="text-destructive text-sm mt-1">{errors.identifier}</p>
        )}
      </div>

      {/* Password */}
      <div className="w-full space-y-1">
        <Label className="leading-5" htmlFor="password">
          Password*
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={isPasswordVisible ? "text" : "password"}
            placeholder="••••••••••••••••"
            className="pr-9"
            value={formData.password}
            onChange={handleChange}
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
          >
            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className="sr-only">
              {isPasswordVisible ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
        {errors.password && (
          <p className="text-destructive text-sm mt-1">{errors.password}</p>
        )}
      </div>

      {/* Remember me + Forgot password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            id="rememberMe"
            className="size-6"
            checked={formData.rememberMe}
            onCheckedChange={handleCheckboxChange}
          />
          <Label htmlFor="rememberMe" className="text-sm cursor-pointer">
            Remember me
          </Label>
        </div>

        <a
          href="/forgot-password"
          className="text-sm text-primary hover:underline font-medium"
        >
          Forgot password?
        </a>
      </div>

      {/* Sign In Button */}
      <Button className="w-full" type="submit">
        Log In
      </Button>
    </form>
  );
};

export default LoginForm;
