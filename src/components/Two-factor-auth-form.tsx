"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

const TwoFactorAuthenticationForm = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();

  // ✅ This "grabs" the email from the URL automatically
  const email = searchParams.get("email") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email, // Passed automatically from the "grabbed" value
          code: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      // Success!
      router.push("/home?verified=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <Label className="text-base">Verification Code</Label>
        <p className="text-sm text-muted-foreground">
          We sent a code to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <InputOTP maxLength={6} value={code} onChange={setCode}>
        <InputOTPGroup className="w-full justify-center gap-2">
          {[...Array(6)].map((_, i) => (
            <InputOTPSlot key={i} index={i} className="rounded-md border" />
          ))}
        </InputOTPGroup>
      </InputOTP>

      {error && <p className="text-destructive text-sm text-center">{error}</p>}

      <Button className="w-full" type="submit" disabled={isLoading || !email}>
        {isLoading ? "Verifying..." : "Verify Account"}
      </Button>
    </form>
  );
};
export default TwoFactorAuthenticationForm;
