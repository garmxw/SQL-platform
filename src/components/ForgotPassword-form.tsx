"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cooldown logic
  const [countdown, setCountdown] = useState(0);

  // Handle the 60s countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendResetLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Something went wrong");

      setStatus({ type: "success", msg: "Reset link sent! Check your inbox." });
      setCountdown(60); // Start cooldown on success
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={sendResetLink} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@vorn.com"
          required
          disabled={status?.type === "success"} // Disable input after success
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />
      </div>

      {status && (
        <div className="space-y-3">
          <p
            className={`text-sm text-center ${status.type === "success" ? "text-green-500" : "text-destructive"}`}
          >
            {status.msg}
          </p>

          {/* Resend UI */}
          {status.type === "success" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => sendResetLink()}
                disabled={countdown > 0 || isLoading}
                className="text-sm font-medium text-primary hover:underline disabled:no-underline disabled:text-muted-foreground transition-all"
              >
                {countdown > 0
                  ? `Resend in ${countdown}s`
                  : "Didn't get the email? Resend"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main button hides after successful send to clear the UI */}
      {status?.type !== "success" && (
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Reset Link"}
        </Button>
      )}
    </form>
  );
};

export default ForgotPasswordForm;
