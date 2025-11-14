# 📝 NPM Commands Guide

## ⚡ Quick Reference

### ✅ **Recommended: Start Everything**
```bash
npm start
```
**यह क्या करता है:**
- ✅ Backend server start करता है (port 4000)
- ✅ Frontend dev server start करता है (port 5000)
- ✅ दोनों एक साथ run होते हैं

**Use when:** आप project को normally चलाना चाहते हो

---

### ⚠️ **NOT Recommended: Frontend Only**
```bash
npm run dev
```
**यह क्या करता है:**
- ✅ सिर्फ Frontend start करता है (port 5000)
- ❌ Backend start NAHI होता (port 4000)
- ❌ Result: "Request Failed" errors

**Use when:** सिर्फ UI testing करनी है और backend की जरूरत नहीं है

---

### 🔧 **Backend Only**
```bash
npm run server
```
**यह क्या करता है:**
- ✅ सिर्फ Backend API server start करता है (port 4000)
- ❌ Frontend start NAHI होता

**Use when:** सिर्फ API testing करनी है

---

### ✔️ **Setup Check**
```bash
npm run check
```
**यह क्या करता है:**
- जांचता है कि सब कुछ properly setup है
- Missing dependencies बताता है
- Data folder check करता है

**Use when:** पहली बार setup कर रहे हो या troubleshooting

---

### 📦 **Build for Production**
```bash
npm run build
```
**यह क्या करता है:**
- Production-ready build बनाता है
- `dist/` folder में optimized files create करता है

**Use when:** Deploy करना है

---

### 👀 **Episode Scraper (Watch Mode)**
```bash
npm run scrape:watch
```
**यह क्या करता है:**
- Episode links scrape करता है
- Continuously watch करता है for new episodes

**Use when:** Automatically episodes track करने हैं

---

## 🎯 Common Scenarios

### Scenario 1: पहली बार project setup कर रहे हो
```bash
npm install          # Dependencies install
npm run check        # Verify setup
npm start            # Start project
```

### Scenario 2: Development कर रहे हो
```bash
npm start           # Always use this!
```

### Scenario 3: सिर्फ Frontend code change किया
```bash
# npm start already running है तो कुछ नहीं करना
# Vite automatically reload कर देगा
```

### Scenario 4: Backend code change किया
```bash
# Ctrl+C से stop करो
npm start           # Restart करो
```

### Scenario 5: Error aa रहा है
```bash
npm run check       # Problem identify करो
# Fix the issues shown
npm start           # Restart करो
```

---

## ⚙️ Script Explanation

| Command | Frontend | Backend | Use Case |
|---------|----------|---------|----------|
| `npm start` | ✅ | ✅ | **Normal development (RECOMMENDED)** |
| `npm run dev` | ✅ | ❌ | Frontend only (will show errors) |
| `npm run server` | ❌ | ✅ | Backend only (for API testing) |
| `npm run check` | - | - | Setup verification |
| `npm run build` | ✅ | - | Production build |

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Running only `npm run dev`
```bash
npm run dev    # ❌ Backend नहीं चलेगा!
```

**Fix:**
```bash
npm start      # ✅ दोनों चलेंगे
```

---

### ❌ Mistake 2: दो अलग terminals में run करना
```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

**Better:**
```bash
# एक ही terminal में
npm start      # ✅ Easier!
```

---

### ❌ Mistake 3: Port already in use error ignore करना
```
Error: EADDRINUSE
```

**Fix:**
```bash
# Check which process is using port
# Windows:
netstat -ano | findstr :5000

# Mac/Linux:
lsof -i :5000

# Kill the process and restart
```

---

## 💡 Pro Tips

### Tip 1: Always use `npm start`
99% of the time, `npm start` is what you need!

### Tip 2: Hot Module Replacement
Frontend changes automatically reload - no need to restart!

### Tip 3: Backend changes need restart
Backend ko manually restart karna padta hai. Use Ctrl+C then `npm start`

### Tip 4: Check logs
Terminal में errors carefully padho - helpful hints milte hain

### Tip 5: Clean install when stuck
```bash
rm -rf node_modules
npm install
npm start
```

---

## 🎬 Quick Start Cheatsheet

```bash
# First time setup
cd "website copy"
npm install
npm run check
npm start

# Daily development
npm start

# Troubleshooting
npm run check

# Production build
npm run build
```

---

**Remember: `npm start` is your best friend! 🚀**
