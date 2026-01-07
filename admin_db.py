import sqlite3
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

ADMIN_DB_NAME = 'admin.db'

@contextmanager
def get_admin_db_connection():
    conn = sqlite3.connect(ADMIN_DB_NAME)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        
        c.execute('''CREATE TABLE IF NOT EXISTS faqs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            cost REAL NOT NULL,
            image_url TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')

def create_faq(question: str, answer: str) -> int:
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO faqs (question, answer) VALUES (?, ?)',
            (question, answer)
        )
        return c.lastrowid

def get_all_faqs() -> List[Dict[str, Any]]:
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM faqs ORDER BY created_at DESC')
        return [dict(row) for row in c.fetchall()]

def get_faq_by_id(faq_id: int) -> Optional[Dict[str, Any]]:
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM faqs WHERE id = ?', (faq_id,))
        result = c.fetchone()
        return dict(result) if result else None

def delete_faq(faq_id: int) -> bool:
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        c.execute('DELETE FROM faqs WHERE id = ?', (faq_id,))
        return c.rowcount > 0

def create_reward(name: str, description: str, cost: float, image_url: str) -> int:
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        c.execute(
            'INSERT INTO rewards (name, description, cost, image_url) VALUES (?, ?, ?, ?)',
            (name, description, cost, image_url)
        )
        return c.lastrowid

def get_all_rewards() -> List[Dict[str, Any]]:
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM rewards ORDER BY cost ASC')
        return [dict(row) for row in c.fetchall()]

def get_reward_by_id(reward_id: int) -> Optional[Dict[str, Any]]:
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM rewards WHERE id = ?', (reward_id,))
        result = c.fetchone()
        return dict(result) if result else None

def delete_reward(reward_id: int) -> bool:
    with get_admin_db_connection() as conn:
        c = conn.cursor()
        c.execute('DELETE FROM rewards WHERE id = ?', (reward_id,))
        return c.rowcount > 0