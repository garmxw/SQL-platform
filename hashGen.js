//this is just for seeding the db with the root admin password hash. Run this file with node and copy the generated hash into your database for the root admin user. Make sure to set the ROOT_ADMIN_PASS in your .env file before running this script.

import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const password = process.env.SEED_ADMIN_PASSWORD;

if (!password) {
  console.error("Please set the SEED_ADMIN_PASSWORD environment variable");
  process.exit(1);
}

bcrypt.hash(password, 12, (err, hash) => {
  if (err) console.error("Hashing error:", err);
  else console.log("Your Generated Hash:", hash);
});

/* then copy the generated hash and run this SQL query to insert the root admin user into your database (make sure to replace the email and username if needed):
INSERT INTO public.users (
    username, 
    email, 
    password_hash, 
    user_role, 
    is_verified
) VALUES (
    'root_admin', 
    'admin@vorn.com', 
    'generated_hash_here', 
    'admin', 
    true
);
*/
