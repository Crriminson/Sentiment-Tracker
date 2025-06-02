# Daily Journal Sentiment Tracker

A web application that analyzes the emotional sentiment of your daily journal entries and visualizes your mood patterns over time.

## Features

- Daily journaling with automatic sentiment analysis
- Interactive mood visualization charts
- SQLite database for data persistence
- Simple, clean interface

## Tech Stack

- **Backend**: Python, Flask, TextBlob, SQLite
- **Frontend**: HTML/CSS/JavaScript, Chart.js

## Installation

1. **Clone and setup backend**
```bash
git clone https://github.com/yourusername/sentiment-tracker.git
cd sentiment-tracker/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m textblob.download_corpora
```

2. **Run the application**
```bash
python app.py
```

3. **Open frontend**
Open `frontend/index.html` in your browser or serve locally:
```bash
cd ../frontend
python -m http.server 3000
```

## API Endpoints

**POST /api/entries** - Add journal entry
```json
{
  "text": "I feel great today!",
  "date": "2024-01-01"
}
```

**GET /api/entries** - Get all entries with sentiment data

## Project Structure

```
sentiment-tracker/
├── backend/
│   ├── app.py
│   ├── database.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## Dependencies

```
flask
textblob
flask-cors
gunicorn
```
