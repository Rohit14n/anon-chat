# 🔒 AnonChat — Fully Anonymous Real-Time Chat

**Koi account nahi. Koi phone nahi. Koi trace nahi.**

---

## ✅ Features

- **100% Anonymous** — Random alias auto-assign hoti hai (e.g. `ShadowFox#4821`)
- **No Login / No Signup** — Seedha open karo aur chat karo
- **Real-Time** — WebSocket (Socket.io) se instant messaging
- **Public Room** — Global Lobby har koi join kar sakta hai
- **Private Rooms** — 6-character code se private room banao aur share karo
- **Ephemeral** — Sab kuch session-based, sever restart pe sb saaf
- **Typing Indicators** — Dekho kaun type kar raha hai
- **Auto-Alias** — Har session pe naya random naam

---

## 🚀 Setup (Local)

### Requirements
- Node.js v18 ya upar

### Steps

```bash
# 1. Folder mein jao
cd anon-chat

# 2. Dependencies install karo
npm install

# 3. Server chalaao
npm start

# 4. Browser mein kholo
# http://localhost:3000
```

---

## 🌐 Deploy karna hai? (Free options)

### Railway.app (Recommended)
1. [railway.app](https://railway.app) pe jao
2. "Deploy from GitHub" — apna repo upload karo
3. Automatically `npm start` run hoga
4. Free URL mil jata hai

### Render.com
1. [render.com](https://render.com) pe jao
2. New Web Service → GitHub repo connect karo
3. Build command: `npm install`
4. Start command: `node server.js`

---

## 📁 File Structure

```
anon-chat/
├── server.js          ← Node.js + Express + Socket.io backend
├── package.json       ← Dependencies
└── public/
    └── index.html     ← Frontend (HTML + CSS + JS)
```

---

## 🔐 Privacy Notes

- Server koi user data store nahi karta permanently
- Messages sirf RAM mein hain (max 200 per room)
- Server restart hote hi sab messages delete
- Koi IP logging nahi (by default)
- Koi cookies nahi, koi localStorage nahi

---

## ⚠️ Production ke liye add karo (optional)

- Rate limiting: `express-rate-limit` package
- HTTPS: Reverse proxy (nginx) ya SSL certificate
- Message encryption: Client-side E2E encryption
- Room password protection

---

Made with 💀 — No logs. No traces. Just chat.
