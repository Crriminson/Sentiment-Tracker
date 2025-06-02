from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
from textblob import TextBlob

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5500", "http://127.0.0.1:5500"])

# Database configuration
DATABASE = 'journal.db'

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Create entries table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            text TEXT NOT NULL,
            sentiment REAL NOT NULL,
            sentiment_label TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    return conn

def analyze_sentiment(text):
    """Analyze sentiment using TextBlob"""
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    
    if polarity > 0.1:
        label = 'Positive' 
    elif polarity < -0.1:
        label = 'Negative'
    else:
        label = 'Neutral'   
    
    return polarity, label

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})

@app.route('/api/entries', methods=['POST'])
def create_entry():
    """Create a new journal entry"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "Text is required"}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({"error": "Text cannot be empty"}), 400
        
        # Use provided date or current date
        entry_date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # Analyze sentiment
        sentiment_score, sentiment_label = analyze_sentiment(text)
        
        # Save to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO entries (date, text, sentiment, sentiment_label, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (entry_date, text, sentiment_score, sentiment_label, datetime.now()))
        
        entry_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "id": entry_id,
            "date": entry_date,
            "text": text,
            "sentiment": round(sentiment_score, 3),
            "sentiment_label": sentiment_label,
            "created_at": datetime.now().isoformat()
        }), 201
    
    except Exception as e:
        print(f"Error creating entry: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/entries', methods=['GET'])
def get_entries():
    """Get all journal entries"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, date, text, sentiment, sentiment_label, created_at
            FROM entries
            ORDER BY date DESC, created_at DESC
        ''')
        
        entries = []
        for row in cursor.fetchall():
            entries.append({
                "id": row['id'],
                "date": row['date'],
                "text": row['text'],
                "sentiment": round(row['sentiment'], 3),
                "sentiment_label": row['sentiment_label'],
                "created_at": row['created_at']
            })
        
        conn.close()
        return jsonify(entries)
    
    except Exception as e:
        print(f"Error fetching entries: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about entries"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get basic stats
        cursor.execute('SELECT COUNT(*) as total FROM entries')
        total = cursor.fetchone()['total']
        
        if total == 0:
            conn.close()
            return jsonify({
                "total_entries": 0,
                "avg_sentiment": 0,
                "positive_count": 0,
                "negative_count": 0,
                "neutral_count": 0
            })
        
        # Get sentiment stats - FIXED: Using capitalized labels to match analyze_sentiment function
        cursor.execute('''
            SELECT 
                AVG(sentiment) as avg_sentiment,
                SUM(CASE WHEN sentiment_label = 'Positive' THEN 1 ELSE 0 END) as positive_count,
                SUM(CASE WHEN sentiment_label = 'Negative' THEN 1 ELSE 0 END) as negative_count,
                SUM(CASE WHEN sentiment_label = 'Neutral' THEN 1 ELSE 0 END) as neutral_count
            FROM entries
        ''')
        
        stats = cursor.fetchone()
        conn.close()
        
        return jsonify({
            "total_entries": total,
            "avg_sentiment": round(stats['avg_sentiment'], 3),
            "positive_count": stats['positive_count'],
            "negative_count": stats['negative_count'],
            "neutral_count": stats['neutral_count']
        })
    
    except Exception as e:
        print(f"Error fetching stats: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    print("Starting Flask app on port 5000")
    print("Available endpoints:")
    print("  POST /api/entries - Create new journal entry")
    print("  GET /api/entries - Get all entries")
    print("  GET /api/stats - Get entry statistics")
    print("  GET /api/health - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5000)