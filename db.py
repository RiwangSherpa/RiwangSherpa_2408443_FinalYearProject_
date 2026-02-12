import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = "studybuddy.db"

def _conn():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def init_db():
    """Create all required tables (idempotent) and apply simple safe migrations."""
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            name TEXT,
            email TEXT,
            bio TEXT,
            updated_at TEXT,
            created_at TEXT
        )
        """
    )
    cur.execute("PRAGMA table_info(users)")
    existing = {row[1] for row in cur.fetchall()}
    for col, col_type in {
        "username": "TEXT",
        "password_hash": "TEXT",
        "name": "TEXT",
        "email": "TEXT",
        "bio": "TEXT",
        "updated_at": "TEXT",
        "created_at": "TEXT",
    }.items():
        if col not in existing:
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS roadmaps (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            title TEXT,
            goal TEXT,
            steps TEXT,
            sources TEXT,
            created_at TEXT
        )
        """
    )
    cur.execute("PRAGMA table_info(roadmaps)")
    rcols = {row[1] for row in cur.fetchall()}
    if "user_id" not in rcols:
        cur.execute("ALTER TABLE roadmaps ADD COLUMN user_id INTEGER")
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS quizzes (
            id INTEGER PRIMARY KEY,
            title TEXT,
            related_roadmap_id INTEGER,
            questions TEXT,
            created_at TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id INTEGER PRIMARY KEY,
            quiz_id INTEGER,
            user_name TEXT,
            answers TEXT,
            score REAL,
            total INTEGER,
            created_at TEXT
        )
        """
    )

    conn.commit()
    conn.close()
def create_user(username: str, password_hash: str) -> int:
    """Create a new user and return its id."""
    conn = _conn()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "INSERT INTO users (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (username, password_hash, now, now),
    )
    conn.commit()
    user_id = cur.lastrowid
    conn.close()
    return user_id

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, username, password_hash, name, email, bio, updated_at FROM users WHERE username = ?",
        (username,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row[0],
        "username": row[1],
        "password_hash": row[2],
        "name": row[3],
        "email": row[4],
        "bio": row[5],
        "updated_at": row[6],
    }

def load_user(user_id: int) -> Dict[str, Any]:
    """Load profile for the given user_id."""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT name, email, bio, updated_at FROM users WHERE id = ?", (user_id,))
    r = cur.fetchone()
    conn.close()
    if r:
        return {"name": r[0] or "", "email": r[1] or "", "bio": r[2] or "", "updated_at": r[3] or ""}
    return {"name": "", "email": "", "bio": "", "updated_at": ""}

def save_user(user_id: int, name: str, email: str, bio: str) -> None:
    """Update profile fields for an existing user."""
    conn = _conn()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "UPDATE users SET name = ?, email = ?, bio = ?, updated_at = ? WHERE id = ?",
        (name, email, bio, now, user_id),
    )
    conn.commit()
    conn.close()
def save_roadmap(title: str, goal: str, steps: List[str], sources: List[str], user_id: Optional[int] = None) -> int:
    """Save a roadmap optionally linked to a user_id. Returns inserted id."""
    conn = _conn()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "INSERT INTO roadmaps (user_id, title, goal, steps, sources, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, title, goal, json.dumps(steps), json.dumps(sources), now),
    )
    conn.commit()
    rid = cur.lastrowid
    conn.close()
    return rid

def list_roadmaps(limit: int = 100, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    if user_id is None:
        cur.execute(
            "SELECT id, user_id, title, goal, steps, sources, created_at FROM roadmaps ORDER BY id DESC LIMIT ?",
            (limit,),
        )
    else:
        cur.execute(
            "SELECT id, user_id, title, goal, steps, sources, created_at FROM roadmaps WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        )
    rows = cur.fetchall()
    conn.close()
    result = []
    for r in rows:
        result.append(
            {
                "id": r[0],
                "user_id": r[1],
                "title": r[2],
                "goal": r[3],
                "steps": json.loads(r[4]) if r[4] else [],
                "sources": json.loads(r[5]) if r[5] else [],
                "created_at": r[6],
            }
        )
    return result

def get_roadmap(rid: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    if user_id is None:
        cur.execute("SELECT id, user_id, title, goal, steps, sources, created_at FROM roadmaps WHERE id = ?", (rid,))
    else:
        cur.execute("SELECT id, user_id, title, goal, steps, sources, created_at FROM roadmaps WHERE id = ? AND user_id = ?", (rid, user_id))
    r = cur.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r[0],
        "user_id": r[1],
        "title": r[2],
        "goal": r[3],
        "steps": json.loads(r[4]) if r[4] else [],
        "sources": json.loads(r[5]) if r[5] else [],
        "created_at": r[6],
    }
def save_quiz(title: str, related_roadmap_id: Optional[int], questions: List[Dict[str, Any]]) -> int:
    """
    Save a quiz. `questions` should be a list of objects like:
    { "q": "...", "options": ["..","..",".."], "answer_index": 0 }
    Returns the quiz id.
    """
    conn = _conn()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "INSERT INTO quizzes (title, related_roadmap_id, questions, created_at) VALUES (?,?,?,?)",
        (title, related_roadmap_id, json.dumps(questions), now),
    )
    conn.commit()
    qid = cur.lastrowid
    conn.close()
    return qid

def list_quizzes(limit: int = 100) -> List[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT id, title, related_roadmap_id, questions, created_at FROM quizzes ORDER BY id DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    result = []
    for r in rows:
        result.append(
            {
                "id": r[0],
                "title": r[1],
                "related_roadmap_id": r[2],
                "questions": json.loads(r[3]) if r[3] else [],
                "created_at": r[4],
            }
        )
    return result

def get_quiz(qid: int) -> Optional[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT id, title, related_roadmap_id, questions, created_at FROM quizzes WHERE id = ?", (qid,))
    r = cur.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r[0],
        "title": r[1],
        "related_roadmap_id": r[2],
        "questions": json.loads(r[3]) if r[3] else [],
        "created_at": r[4],
    }

def save_quiz_attempt(quiz_id: int, user_name: str, answers: List[int], score: float, total: int) -> int:
    """Save a user's quiz attempt. Returns attempt id."""
    conn = _conn()
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "INSERT INTO quiz_attempts (quiz_id, user_name, answers, score, total, created_at) VALUES (?,?,?,?,?,?)",
        (quiz_id, user_name, json.dumps(answers), score, total, now),
    )
    conn.commit()
    aid = cur.lastrowid
    conn.close()
    return aid

def list_attempts_for_quiz(quiz_id: int, limit: int = 100) -> List[Dict[str, Any]]:
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, quiz_id, user_name, answers, score, total, created_at FROM quiz_attempts WHERE quiz_id = ? ORDER BY id DESC LIMIT ?",
        (quiz_id, limit),
    )
    rows = cur.fetchall()
    conn.close()
    result = []
    for r in rows:
        result.append(
            {
                "id": r[0],
                "quiz_id": r[1],
                "user_name": r[2],
                "answers": json.loads(r[3]) if r[3] else [],
                "score": r[4],
                "total": r[5],
                "created_at": r[6],
            }
        )
    return result
