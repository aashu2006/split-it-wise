// The dashboard is a client component, so its metadata lives here. A group's
// URL is private to its members; nothing under it should reach a search index.
export const metadata = {
    title: "Group",
    robots: { index: false, follow: false },
};

export default function GroupLayout({ children }) {
    return children;
}
