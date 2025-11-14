# Quick Setup Guide / त्वरित सेटअप गाइड

## अगर "Request Failed" Error आ रहा है तो ये करें:

### Step 1: Dependencies Install करें
```bash
cd "website copy"
npm install
```

### Step 2: Data Folder Check करें
```bash
# Check if data folder exists
ls data/

# If not exists, create it
mkdir -p data
```

### Step 3: दोनों Servers एक साथ चलाएं
```bash
npm start
```

### Step 4: Browser में खोलें
```
http://localhost:5000
```

---

## Checklist ✓

- [ ] Node.js installed (version 18+)
- [ ] `npm install` run किया
- [ ] `data/` folder exists
- [ ] `npm start` command से चलाया
- [ ] Browser में `http://localhost:5000` खोला

---

## अगर फिर भी काम नहीं कर रहा:

### 1. Port Check करें
```bash
# Windows
netstat -ano | findstr :5000
netstat -ano | findstr :4000

# Mac/Linux  
lsof -i :5000
lsof -i :4000
```

### 2. Dependencies फिर से install करें
```bash
rm -rf node_modules
npm install
```

### 3. Console में errors देखें
- Browser DevTools खोलें (F12)
- Console tab में errors check करें
- Network tab में failed requests देखें

---

## Replit vs Local का फर्क

| Feature | Replit | Local Machine |
|---------|--------|---------------|
| Auto-setup | ✅ Yes | ❌ No - Manual setup needed |
| Dependencies | ✅ Auto-installed | ❌ Run `npm install` |
| Port Config | ✅ Auto-configured | ⚠️ May need adjustment |
| Data Folder | ✅ Already present | ❌ May be missing |

---

## Ports की Information

- **Frontend (Vite):** Port 5000 पर चलता है
- **Backend (Express API):** Port 4000 पर चलता है
- **Proxy:** Vite automatically `/api` requests को port 4000 forward करता है

---

## Important Files

- `package.json` - Dependencies और scripts
- `vite.config.js` - Frontend server configuration
- `server/index.js` - Backend API server
- `data/` - Anime/series data files (JSON format)

---

**आपकी समस्या solve हो गई? अगर नहीं तो specific error message share करें! 🚀**
