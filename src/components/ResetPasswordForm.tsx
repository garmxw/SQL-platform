"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ResetPasswordForm = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const { token } = useParams(); // Grabs the token from /reset-password/[token]
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // Frontend-side check for immediate feedback
    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "Passwords do not match." });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirmPassword, // Now passing both to the backend
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Reset failed");

      setStatus({
        type: "success",
        msg: "Password reset successful! Redirecting to login...",
      });

      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Password */}
      <div className="w-full space-y-1">
        <Label className="leading-5" htmlFor="password">
          New Password*
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={isPasswordVisible ? "text" : "password"}
            placeholder="••••••••••••••••"
            className="pr-9"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
          >
            {isPasswordVisible ? (
              <EyeOffIcon size={18} />
            ) : (
              <EyeIcon size={18} />
            )}
          </Button>
        </div>
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
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
            }
            className="absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
          >
            {isConfirmPasswordVisible ? (
              <EyeOffIcon size={18} />
            ) : (
              <EyeIcon size={18} />
            )}
          </Button>
        </div>
      </div>

      {status && (
        <p
          className={`text-sm text-center ${status.type === "success" ? "text-green-500" : "text-destructive"}`}
        >
          {status.msg}
        </p>
      )}

      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? "Updating..." : "Set New Password"}
      </Button>
    </form>
  );
};

export default ResetPasswordForm;
