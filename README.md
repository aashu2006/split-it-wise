# Split-It-Wise 

A simple, real-world **expense splitting web app** for students and friends.  
Inspired by Splitwise, built with a focus on **clarity, speed, and actual usability**.

🌐 **Live Demo:** https://split-it-wise.vercel.app

---

##  Features

###  Authentication
- Google Sign-In using Firebase Authentication
- Secure and production-ready auth flow

###  Group Management
- Create groups instantly
- Invite friends via shareable links
- Join groups with one click
- Admin controls:
  - Rename group
  - Remove members
  - Delete group

###  Expense Management
- Add expenses in **INR (₹)**
- Select who paid
- Automatic **equal split** among members
- Delete expenses (admin or creator only)

###  Balance Summary
- Clear per-user balances
- Shows:
  - **“₹X lena hai”** (you should receive)
  - **“₹X dena hai”** (you owe)
- Real-time updates on every expense change

###  UI & UX
- Mobile-first design
- Clean, minimal layout
- No unnecessary clutter — just what users need

---

##  Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Firebase Google Auth
- **Database:** Firebase Firestore
- **Hosting:** Vercel
- **State & Logic:** React hooks + Firestore real-time listeners

---

##  How It Works

- Each **group** stores:
  - Members
  - Admin (creator)
- Each **expense** stores:
  - Amount
  - Paid by
  - Group ID
- For each group:
  - Total expenses are split equally
  - Balance = `total paid − total share`
- Balances recalculate automatically when data changes

---

Author: Akshat Patil ❤️
