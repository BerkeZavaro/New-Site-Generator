/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // serverExternalPackages: List packages that should not be bundled in Server Components
  // Next.js 16 automatically excludes many packages (like @prisma/client, sharp, etc.)
  // Add packages here only if they need native Node.js require() and aren't auto-excluded
  // serverExternalPackages: [],
}

module.exports = nextConfig

