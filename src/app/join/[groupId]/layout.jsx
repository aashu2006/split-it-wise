// Invite links get pasted into chats, so the preview has to make sense to the
// person receiving one; the group id in the URL is the invite secret and must
// never be indexed.
export const metadata = {
    title: "You're invited",
    description: "Join a group on Split-It-Wise to split expenses and see who owes whom.",
    robots: { index: false, follow: false },
};

export default function JoinLayout({ children }) {
    return children;
}
