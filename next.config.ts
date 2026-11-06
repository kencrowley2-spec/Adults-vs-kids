import type { NextConfig } from "next";
const privatePaths=['/family/:path*','/admin/:path*','/api/:path*','/auth/:path*','/login','/signup','/logout','/forgot-password','/reset-password','/verify-email','/member-preview','/play/:path*','/club-checkout','/clubhouse-setup/:path*'];
const nextConfig:NextConfig={async headers(){return privatePaths.map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'}]}));}};
export default nextConfig;
