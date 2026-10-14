const SITE_URL = "https://split-it-wise.vercel.app";

export default function sitemap() {
    return [{ url: SITE_URL, changeFrequency: "monthly", priority: 1 }];
}
