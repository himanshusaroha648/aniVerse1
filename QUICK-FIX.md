# ⚡ QUICK FIX - "Request Failed" Error

## यह Guide तब use करो जब आपको यह error दिखे:

```
Request failed
```

---

## 🎯 सबसे Common Solution (90% cases में काम करता है)

### Terminal खोलो और ये commands run करो:

```bash
# Step 1: Project folder में जाओ
cd "website copy"

# Step 2: Dependencies install करो (अगर पहले नहीं किया)
npm install

# Step 3: दोनों servers start करो
npm start

# ⚠️ IMPORTANT: "npm run dev" use मत करो!
# "npm start" ही use करो (दोनों servers start होंगे)
```

### अब Browser में जाओ:
```
http://localhost:5000
```

✅ काम कर गया? Great! 🎉

❌ अभी भी error है? नीचे देखो ⬇️

---

## 🔍 Debug Steps (अगर ऊपर वाला काम नहीं किया)

### Check 1: क्या दोनों servers चल रहे हैं?

Terminal में यह दिखना चाहिए:
```
[0] API listening on http://localhost:4000    ← Backend
[1] Local: http://localhost:5000/             ← Frontend
```

✅ दोनों दिख रहे हैं = Good!
❌ एक भी नहीं दिख रहा = `npm start` फिर से run करो

---

### Check 2: Browser Console में error है?

1. Browser में जाओ: `http://localhost:5000`
2. Press **F12** (Developer Tools)
3. **Console** tab click करो
4. देखो कोई red errors हैं?

**Common Error Messages:**

#### Error: "Failed to fetch"
**मतलब:** Backend server से connect नहीं हो पा रहा

**Fix:**
```bash
# Terminal check करो - यह line दिखनी चाहिए:
API listening on http://localhost:4000
```

अगर नहीं दिख रहा:
```bash
# Ctrl+C से stop करो
# फिर restart करो
npm start
```

#### Error: "Cannot connect to backend server"
**मतलब:** Backend server (port 4000) नहीं चल रहा

**Fix:**
```bash
# दोनों servers एक साथ चलाओ
npm start
```

---

### Check 3: Ports already use में तो नहीं?

**Windows:**
```bash
netstat -ano | findstr :5000
netstat -ano | findstr :4000
```

**Mac/Linux:**
```bash
lsof -i :5000
lsof -i :4000
```

अगर कोई दूसरा program use कर रहा है:
1. Us program को बंद करो
2. `npm start` फिर से run करो

---

### Check 4: Data folder exists?

```bash
# Check करो
ls data/

# अगर error आए तो create करो
mkdir data
```

⚠️ **Important:** अगर data folder खाली है तो library empty दिखेगी, लेकिन "Request failed" error नहीं आना चाहिए।

---

### Check 5: Dependencies properly installed हैं?

```bash
# node_modules delete करो
rm -rf node_modules package-lock.json

# फिर से install करो
npm install

# Start करो
npm start
```

---

## 🛠️ Automated Setup Check

इस command से सब कुछ automatically check होगा:

```bash
npm run check
```

यह बताएगा कि क्या missing है!

---

## 📊 Working vs Not Working

### ✅ सब कुछ सही है अगर:

**Terminal:**
```
[0] API listening on http://localhost:4000
[1] VITE v5.x.x ready in XXX ms
[1] Local: http://localhost:5000/
```

**Browser:**
- Page load हो रहा है
- Latest Episodes section दिख रहा है (अगर data में content है)
- Console में कोई red error नहीं है

### ❌ Problem है अगर:

**Terminal:**
```
Error: EADDRINUSE (port already in use)
Error: Cannot find module
```

**Browser:**
```
Request failed
Failed to fetch
Cannot connect to backend
```

---

## 🎓 समझो कैसे काम करता है

यह project **2 servers** use करता है:

1. **Frontend Server (Vite)** - Port 5000
   - यह वो है जो browser में दिखता है
   - React app run करता है

2. **Backend Server (Express)** - Port 4000
   - यह data provide करता है (API)
   - `data/` folder से content पढ़ता है

दोनों को **साथ में चलना जरूरी है** वरना "Request failed" error आएगा!

---

## 💡 Pro Tip

हमेशा `npm start` use करो (न कि `npm run dev`)

क्योंकि `npm start`:
- ✅ दोनों servers start करता है
- ✅ Automatically proper configuration use करता है

---

## 🆘 अभी भी काम नहीं कर रहा?

### Full Clean Install:

```bash
# Step 1: सब कुछ clean करो
rm -rf node_modules package-lock.json

# Step 2: Fresh install
npm install

# Step 3: Setup check
npm run check

# Step 4: Start
npm start

# Step 5: Browser
# http://localhost:5000
```

---

## 📞 Debug Information जो हमें चाहिए

अगर फिर भी problem है, तो यह information share करो:

1. **Node.js version:**
   ```bash
   node --version
   ```

2. **Setup check output:**
   ```bash
   npm run check
   ```

3. **Terminal logs:**
   - `npm start` run करने के बाद क्या दिखता है?

4. **Browser console errors:**
   - F12 > Console में क्या errors हैं?

---

**इन steps से 99% cases में problem solve हो जाती है! 🚀**

अगर नहीं, तो INSTALL.md file detail में पढ़ो।
