/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['res.cloudinary.com'], // Allow Cloudinary images
    },
    experimental: {
        // serverActions: true, // Enabled by default in Next.js 14
    }
};

export default nextConfig;
