import sqlite3
from datetime import datetime
import os

# Database file path
DB_PATH = 'journal_entries.db'

def init_database():
    """Initialize the database and create tables if they don't exist"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create entries table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                date TEXT NOT NULL,
                sentiment_score REAL NOT NULL,
                sentiment_label TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
        print(f"✅ Database initialized successfully at {DB_PATH}")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")

def add_entry_to_db(text, date, sentiment_score, sentiment_label):
    """Add a new journal entry to the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        created_at = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO entries (text, date, sentiment_score, sentiment_label, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (text, date, sentiment_score, sentiment_label, created_at))
        
        # Get the ID of the newly inserted entry
        entry_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        # Return the complete entry
        return {
            'id': entry_id,
            'text': text,
            'date': date,
            'sentiment_score': sentiment_score,
            'sentiment_label': sentiment_label,
            'created_at': created_at
        }
        
    except Exception as e:
        print(f"❌ Error adding entry to database: {e}")
        raise e

def get_all_entries():
    """Get all journal entries from the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, text, date, sentiment_score, sentiment_label, created_at
            FROM entries
            ORDER BY created_at DESC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        # Convert rows to dictionaries
        entries = []
        for row in rows:
            entry = {
                'id': row[0],
                'text': row[1],
                'date': row[2],
                'sentiment_score': row[3],
                'sentiment_label': row[4],
                'created_at': row[5]
            }
            entries.append(entry)
        
        return entries
        
    except Exception as e:
        print(f"❌ Error getting entries from database: {e}")
        return []

def get_entry_count():
    """Get the total number of entries in the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM entries')
        count = cursor.fetchone()[0]
        
        conn.close()
        return count
        
    except Exception as e:
        print(f"❌ Error getting entry count: {e}")
        return 0