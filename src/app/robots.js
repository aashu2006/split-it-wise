const SITE_URL = "https://split-it-wise.vercel.app";

// Only the landing page is public. Group pages need sign-in anyway, and an
// invite URL carries the group's id, which is the invite secret.
export default function robots() {
    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/group/", "/join/"] },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
