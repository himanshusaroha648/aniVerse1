# 🚀 Installation Guide - Local Machine पर Run करने के लिए

## पहले यह पढ़ें! (IMPORTANT)

यह project **Replit** पर बनाया गया है और वहां automatically सब setup हो जाता है। 
लेकिन अगर आप इसे अपने **local computer** पर run करना चाहते हो, तो नीचे दिए गए steps follow करो।

---

## ⚡ Quick Start (सबसे आसान तरीका)

### Step 1️⃣: Project Download करो
```bash
# GitHub से clone करो या ZIP download करो
cd "website copy"
```

### Step 2️⃣: Dependencies Install करो
```bash
npm install
```

### Step 3️⃣: Setup Check करो
```bash
npm run check
```
यह command आपको बताएगा कि क्या missing है।

### Step 4️⃣: Start करो
```bash
npm start
```

### Step 5️⃣: Browser में खोलो
```
http://localhost:5000
```

---

## 🔧 Detailed Setup (अगर problem आए)

### Requirement 1: Node.js Install करो

**Check करो कि installed है या नहीं:**
```bash
node --version
```

अगर `v18.0.0` या उससे ऊपर नहीं है, तो download करो:
- Windows/Mac/Linux: https://nodejs.org (LTS version)

### Requirement 2: Dependencies Install करो

```bash
# Project folder में जाओ
cd "website copy"

# सभी dependencies install करो
npm install
```

यह command install करेगा:
- React (Frontend framework)
- Vite (Development server)
- Express (Backend API server)
- और सभी जरूरी libraries

### Requirement 3: Data Folder Setup

```bash
# Check करो कि data folder है या नहीं
ls -la data/

# अगर नहीं है तो बनाओ
mkdir data
```

**Important:** `data/` folder में आपके anime/series के JSON files होने चाहिए।

Example structure:
```
data/
├── my-hero-academia/
│   ├── series.json
│   ├── season-1/
│   │   ├── episode-1.json
│   │   ├── episode-2.json
│   └── season-2/
│       ├── episode-1.json
└── death-note/
    ├── series.json
    └── season-1/
        ├── episode-1.json
```

---

## 🏃 Running the Project

### Option A: सब कुछ एक साथ (Recommended)
```bash
npm start
```
यह command दोनों servers (frontend + backend) एक साथ चलाएगा।

### Option B: अलग-अलग Terminals में

**Terminal 1 - Backend API:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

---

## ❌ Common Errors और Solutions

### Error 1: "Request failed" दिख रहा है

**कारण:** Backend server नहीं चल रहा या data folder खाली है।

**Solution:**
```bash
# 1. Check करो दोनों servers चल रहे हैं
npm start

# 2. Backend logs check करो
# Terminal में "API listening on http://localhost:4000" दिखना चाहिए

# 3. Browser console खोलो (F12) और error देखो
```

### Error 2: "EADDRINUSE: address already in use"

**कारण:** Port 5000 या 4000 पहले से use में है।

**Solution:**

**Windows:**
```bash
# Check कौन port use कर रहा है
netstat -ano | findstr :5000
netstat -ano | findstr :4000

# Process kill करो (Process ID से)
taskkill /PID <PID_NUMBER> /F
```

**Mac/Linux:**
```bash
# Check कौन port use कर रहा है
lsof -i :5000
lsof -i :4000

# Process kill करो
kill -9 <PID_NUMBER>
```

### Error 3: "Cannot find module 'xyz'"

**कारण:** Dependencies properly install नहीं हुए।

**Solution:**
```bash
# node_modules delete करो और फिर से install करो
rm -rf node_modules package-lock.json
npm install
```

### Error 4: "data/ folder not found"

**कारण:** Data folder missing है।

**Solution:**
```bash
# Data folder बनाओ
mkdir data

# अपने anime/series folders add करो
# Example:
# data/naruto/series.json
# data/naruto/season-1/episode-1.json
```

---

## 🔍 Troubleshooting Checklist

✅ **Setup Check:**
```bash
npm run check
```

✅ **Dependencies:**
```bash
npm list --depth=0
```

✅ **Port Check:**
- Frontend should be on `http://localhost:5000`
- Backend should be on `http://localhost:4000`

✅ **Browser Console:**
- Press F12 > Console tab
- देखो कोई red errors तो नहीं हैं

✅ **Network Tab:**
- Press F12 > Network tab
- Reload page
- `/api/library` या `/api/latest-episodes` requests failed हैं क्या?

---

## 📁 Folder Structure

```
website copy/
├── data/                  # ⚠️ Anime/series data (may be missing locally)
├── src/                   # Frontend React code
│   ├── api/              # API client
│   ├── components/       # React components
│   └── pages/            # Page components
├── server/               # Backend Express server
│   └── index.js         # API endpoints
├── public/              # Static files
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── check-setup.js       # Setup checker script
└── INSTALL.md           # यह file
```

---

## 🌐 Replit vs Local Machine

| Feature | Replit | Local Machine |
|---------|--------|---------------|
| Auto Setup | ✅ Automatic | ❌ Manual required |
| Dependencies | ✅ Auto-installed | ⚠️ Run `npm install` |
| Port Config | ✅ Works out-of-box | ⚠️ May need to adjust |
| Data Folder | ✅ Already has data | ❌ Need to add manually |
| Environment | ✅ Cloud-based | 💻 Your computer |
| Updates | ✅ Always latest | ⚠️ Need to pull updates |

---

## 💡 Pro Tips

1. **Development:**
   - Frontend automatically reloads on code changes (Hot Module Replacement)
   - Backend needs manual restart or use `nodemon`

2. **Data:**
   - Keep your `data/` folder organized
   - Use proper JSON format for series/episode files

3. **Ports:**
   - Don't change ports unless necessary
   - If you change, update both `vite.config.js` and `server/index.js`

4. **Performance:**
   - Close unused applications using ports 5000/4000
   - Use Chrome DevTools to debug

---

## 🆘 Still Having Issues?

1. **Run setup check:**
   ```bash
   npm run check
   ```

2. **Check logs:**
   - Terminal logs (where you ran `npm start`)
   - Browser console logs (F12 > Console)

3. **Clean install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm start
   ```

4. **Verify Node version:**
   ```bash
   node --version  # Should be v18 or higher
   npm --version   # Should be v9 or higher
   ```

---

## ✅ Success Check

Agar sab kuch sahi hai to:

1. ✅ Terminal में दिखेगा:
   ```
   API listening on http://localhost:4000
   VITE ready in XXX ms
   Local: http://localhost:5000/
   ```

2. ✅ Browser में `http://localhost:5000` khulega

3. ✅ Page पर anime/series दिखेंगे (if data folder has content)

4. ✅ Console में कोई red errors नहीं होंगे

---

**Happy Coding! 🚀**

अगर फिर भी problem है, तो specific error message share करो!
