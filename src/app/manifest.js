// Lets the app be added to a phone's home screen with its own icon and name,
// which is how most people open it: from the same phone they pay with.
export default function manifest() {
    return {
        name: "Split-It-Wise",
        short_name: "Split-It-Wise",
        description: "Split bills with friends and settle up over UPI.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#16a34a",
        icons: [
            { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
            { src: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
            { src: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
            {
                src: "/icons/maskable-512.png",
                type: "image/png",
                sizes: "512x512",
                purpose: "maskable",
            },
        ],
    };
}
