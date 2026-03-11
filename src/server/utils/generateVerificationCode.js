import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export async function generateVerificationCode() {
  const code = crypto.randomInt(100000, 999999).toString(); // Generate a random 6-digit code
  const secret = process.env.VERIFICATION_CODE_SECRET; // Use a secret key from environment variables
  const expiry = Date.now() + 30 * 60 * 1000; // Set expiry time to  30 minutes from now
  const ExpiryDate = new Date(expiry);

  const data = `${code}.${ExpiryDate}`; // Create a string that includes the code, and expiry time
  const hash = crypto.createHmac("sha256", secret).update(data).digest("hex"); // Create a hash of the data using the secret key
  return { data, code, hash, ExpiryDate: ExpiryDate };
}
