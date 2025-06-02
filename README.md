# 📔 Daily Journal Sentiment Tracker

> A beautiful web application that analyzes the emotional sentiment of your daily journal entries and visualizes your mood patterns over time.

---

## ✨ Features

- 📝 **Daily Journaling** - Write and save your thoughts
- 🧠 **Smart Analysis** - Automatic sentiment detection using AI
- 📊 **Mood Visualization** - Interactive charts showing your emotional journey
- 💾 **Data Persistence** - All entries securely saved
- 🎨 **Clean Interface** - Simple and intuitive design

---

## 🛠️ Tech Stack

| Frontend | Backend | Database | AI/ML |
|----------|---------|----------|-------|
| HTML/CSS/JS | Python Flask | SQLite | TextBlob NLP |
| Chart.js | Flask-CORS | - | Sentiment Analysis |

---

## 🚀 Quick Start

### 1️⃣ Clone & Setup
```bash
git clone https://github.com/yourusername/sentiment-tracker.git
cd sentiment-tracker/backend
```

### 2️⃣ Install Dependencies
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m textblob.download_corpora
```

### 3️⃣ Launch Application
```bash
python app.py
```

### 4️⃣ Open Frontend
```bash
cd ../frontend
python -m http.server 3000
# Visit: http://localhost:3000
```

---

## 📡 API Reference

### `POST /api/entries`
**Add a new journal entry**
```json
{
  "text": "I feel amazing today! 😊",
  "date": "2024-01-01"
}
```

### `GET /api/entries`
**Retrieve all entries with sentiment analysis**
```json
{
  "entries": [
    {
      "id": 1,
      "text": "I feel amazing today! 😊",
      "sentiment_score": 0.8,
      "sentiment_label": "positive"
    }
  ]
}
```

---

## 📁 Project Structure

```
📦 sentiment-tracker/
├── 🔧 backend/
│   ├── app.py              # Flask application
│   ├── database.py         # Database operations
│   └── requirements.txt    # Python dependencies
└── 🎨 frontend/
    ├── index.html         # Main interface
    ├── style.css          # Styling
    └── script.js          # Frontend logic
```

---

## 📦 Dependencies

```txt
flask
textblob
flask-cors
gunicorn
```

---

<div align="center">

**Made with ❤️ for tracking your emotional journey**

⭐ Star this repo if you found it helpful!

</div>
