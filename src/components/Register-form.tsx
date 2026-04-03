"use client";

import { useState } from "react";

import { EyeIcon, EyeOffIcon, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

const RegisterForm = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    barColor: "",
  });

  // Password strength calculator (0-4 bars)
  const getPasswordStrength = (password: string) => {
    if (!password) {
      return { score: 0, label: "", barColor: "" };
    }

    let score = 0;

    // Length contribution
    if (password.length >= 8) score += 2;
    else if (password.length >= 6) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    score = Math.min(score, 4);

    // Map to strength level
    if (score <= 2) {
      return {
        score: score || 1,
        label: "Weak",
        barColor: "bg-red-500",
      };
    } else if (score <= 3) {
      return {
        score: 3,
        label: "Medium",
        barColor: "bg-amber-500",
      };
    } else {
      return {
        score: 4,
        label: "Strong",
        barColor: "bg-green-500",
      };
    }
  };

  // Password requirements (what the user should enter)
  const passwordRequirements = formData.password
    ? [
        {
          met: formData.password.length >= 8,
          text: "At least 8 characters",
        },
        {
          met: /[a-z]/.test(formData.password),
          text: "One lowercase letter",
        },
        {
          met: /[A-Z]/.test(formData.password),
          text: "One uppercase letter",
        },
        {
          met: /\d/.test(formData.password),
          text: "One number",
        },
        {
          met: /[^A-Za-z0-9]/.test(formData.password),
          text: "One special character (!@#$%^&*)",
        },
      ]
    : [];

  // Handle text input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Clear error for the current field (and confirmPassword if password changed)
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      if (id === "password") {
        delete updated.confirmPassword;
      }
      return updated;
    });

    // Update password strength in real time
    if (id === "password") {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      agree: checked,
    }));

    // Clear checkbox error
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.agree;
      return updated;
    });
  };

  // Full form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (formData.username.length > 20) {
      newErrors.username = "Username must be at most 20 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Checkbox validation
    if (!formData.agree) {
      newErrors.agree = "You must agree to the privacy policy & terms";
    }

    return newErrors;
  };

  // Form submission with validation
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validateForm();

    // Extra client-side check for the checkbox
    if (!formData.agree) {
      validationErrors.agree = "You must agree to the terms";
    }

    setErrors(validationErrors);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (Object.keys(validationErrors).length === 0) {
      setIsLoading(true);
      try {
        const response = await fetch(`${apiUrl}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            agree: formData.agree,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // 1. Check for "user already exists" safely
          if (data.message && data.message.includes("exists")) {
            data.message.toLowerCase().includes("email")
              ? setErrors({ email: data.message })
              : setErrors({ username: data.message });
          }
          // 2. Check for validation errors
          else if (data.errors && data.errors.length > 0) {
            const error = data.errors[0];

            setErrors({ [error.field]: error.message });
          }
          // 3. Fallback for any other error
          else {
            setErrors({ form: data.message || "An unexpected error occurred" });
          }

          return;
        }
        // Success! Redirect to verification
        router.push(
          `/verify-email?email=${encodeURIComponent(formData.email)}`,
        );
      } catch (err) {
        setErrors({
          form: "Registration failed. Please check your connection.",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Username */}
      <div className="space-y-1">
        <Label className="leading-5" htmlFor="username">
          Username*
        </Label>
        <Input
          type="text"
          id="username"
          placeholder="Enter your username"
          value={formData.username}
          onChange={handleChange}
        />
        {errors.username && (
          <p className="text-destructive text-sm mt-1">{errors.username}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <Label className="leading-5" htmlFor="email">
          Email address*
        </Label>
        <Input
          type="email"
          id="email"
          placeholder="Enter your email address"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && (
          <p className="text-destructive text-sm mt-1">{errors.email}</p>
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
            onClick={() => setIsPasswordVisible((prevState) => !prevState)}
            className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
          >
            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className="sr-only">
              {isPasswordVisible ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>

        {/* Password strength indicator + requirements */}
        {formData.password && (
          <div className="mt-3 space-y-3">
            {/* Strength bars */}
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                      index < passwordStrength.score
                        ? passwordStrength.barColor
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              {/* Strength label */}
              {passwordStrength.label && (
                <p
                  className={`text-sm font-medium ${
                    passwordStrength.score <= 2
                      ? "text-red-500"
                      : passwordStrength.score === 3
                        ? "text-amber-500"
                        : "text-green-500"
                  }`}
                >
                  {passwordStrength.label}
                </p>
              )}
            </div>

            {/* What the user should enter - Password requirements */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Your password must contain:
              </p>
              <div className="space-y-2 text-xs">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {req.met ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                      className={
                        req.met ? "text-green-500" : "text-muted-foreground"
                      }
                    >
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {errors.password && (
          <p className="text-destructive text-sm mt-1">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="w-full space-y-1">
        <Label className="leading-5" htmlFor="confirmPassword">
          Confirm Password*
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={isConfirmPasswordVisible ? "text" : "password"}
            placeholder="••••••••••••••••"
            className="pr-9"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() =>
              setIsConfirmPasswordVisible((prevState) => !prevState)
            }
            className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
          >
            {isConfirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className="sr-only">
              {isConfirmPasswordVisible ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
        {errors.confirmPassword && (
          <p className="text-destructive text-sm mt-1">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* Privacy policy */}
      <div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="agree"
            className="size-6"
            checked={formData.agree}
            onCheckedChange={handleCheckboxChange}
          />
          <Label htmlFor="agree">
            <span className="text-muted-foreground">I agree to</span>{" "}
            <a href="#" className="hover:underline">
              privacy policy &amp; terms
            </a>
          </Label>
        </div>
        {errors.agree && (
          <p className="text-destructive text-sm mt-1">{errors.agree}</p>
        )}
      </div>

      <Button className="w-full" type="submit">
        Sign Up to Vorn
      </Button>
    </form>
  );
};

export default RegisterForm;
