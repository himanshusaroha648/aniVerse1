# Aniverse - Anime Streaming Platform

## Setup Instructions / सेटअप निर्देश

### Prerequisites / ज़रूरी चीजें
- Node.js (version 18 या उससे ऊपर)
- npm (Node Package Manager)

### Installation / इंस्टालेशन

1. **Dependencies Install करें:**
   ```bash
   cd "website copy"
   npm install
   ```

2. **Data Folder Check करें:**
   - सुनिश्चित करें कि `data/` folder मौजूद है
   - अगर नहीं है तो create करें: `mkdir data`
   - Data folder में anime/series के JSON files होने चाहिए

### Running the Project / प्रोजेक्ट चलाना

#### सभी servers एक साथ चलाने के लिए (Recommended):
```bash
npm start
```
यह command दोनों servers चलाएगा:
- Backend API Server: `http://localhost:4000`
- Frontend Dev Server: `http://localhost:5000`

#### अलग-अलग servers चलाने के लिए:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Dev Server:**
```bash
npm run dev
```

### Important Notes / महत्वपूर्ण नोट्स

1. **Port Configuration:**
   - Backend: Port 4000
   - Frontend: Port 5000
   - अगर ये ports already use में हैं तो error आएगी

2. **Data Folder:**
   - Backend server `data/` folder से content पढ़ता है
   - अगर data folder खाली है या missing है तो API requests fail होंगी

3. **Development vs Production:**
   - Replit पर automatically सब configure होता है
   - Local machine पर manually setup करना पड़ता है

### Common Errors / आम एरर्स

#### "Request Failed" Error:
**कारण:**
- Backend server नहीं चल रहा (port 4000)
- Data folder missing है
- Dependencies install नहीं हुए

**Solution:**
1. Check करें कि `npm install` run किया है
2. `npm start` से दोनों servers चलाएं
3. Browser में `http://localhost:5000` खोलें

#### Port Already in Use:
**कारण:** Port 4000 या 5000 पहले से use में है

**Solution:**
```bash
# Windows पर:
netstat -ano | findstr :4000
netstat -ano | findstr :5000

# Mac/Linux पर:
lsof -i :4000
lsof -i :5000
```
Running process को बंद करें या `vite.config.js` में port बदलें

#### API Connection Failed:
**कारण:** Frontend backend से connect नहीं हो पा रहा

**Solution:**
- Ensure both servers are running
- Check `vite.config.js` proxy configuration
- Verify backend is running on port 4000

### Project Structure / प्रोजेक्ट स्ट्रक्चर

```
website copy/
├── data/              # Anime/Series JSON data files
├── src/               # Frontend React code
│   ├── api/          # API client
│   ├── components/   # React components
│   └── pages/        # Page components
├── server/           # Backend Express server
│   └── index.js     # API routes
├── public/          # Static assets
├── package.json     # Dependencies
└── vite.config.js  # Vite configuration
```

### Development / डेवलपमेंट

- Frontend automatically reloads on changes (Hot Module Replacement)
- Backend को manually restart करना पड़ेगा code changes के बाद
- या `nodemon` use करें auto-restart के लिए

### Build for Production / प्रोडक्शन के लिए बिल्ड

```bash
npm run build
```

यह `dist/` folder में optimized production build बनाएगा।

### Troubleshooting / समस्या समाधान

1. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node version:**
   ```bash
   node --version  # Should be 18.x or higher
   ```

3. **Verify data folder exists:**
   ```bash
   ls -la data/
   ```

## Support

अगर कोई problem आए तो:
1. सभी dependencies install हैं check करें
2. दोनों servers (frontend + backend) चल रहे हैं verify करें
3. Console में errors check करें
4. Browser DevTools का Network tab देखें API requests के लिए

---

**Note:** यह project Replit पर optimally run करने के लिए designed है, लेकिन local development के लिए भी काम करता है अगर सही setup हो।
