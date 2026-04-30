/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js automatically looks for /src/app if /app doesn't exist at root
  reactStrictMode: true,
  //for the images to be loaded in <Image/>
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
