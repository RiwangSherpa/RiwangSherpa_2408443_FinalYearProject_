"""
Database migration script to add theme_preference field to users table
"""

import sqlite3
import os
from pathlib import Path

def migrate_theme_preference():
    """Add theme_preference column to users table if it doesn't exist"""
    
    # Database path
    db_path = Path(__file__).parent / "database" / "study_buddy.db"
    
    if not db_path.exists():
        print("Database not found. Please run the app first to create it.")
        return
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if theme_preference column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'theme_preference' not in columns:
            print("Adding theme_preference column to users table...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN theme_preference VARCHAR(10) DEFAULT 'light'
            """)
            conn.commit()
            print("✅ theme_preference column added successfully!")
        else:
            print("✅ theme_preference column already exists")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        print(f"Current users table columns: {columns}")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_theme_preference()
