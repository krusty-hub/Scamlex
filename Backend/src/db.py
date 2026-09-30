"""
db.py — SQLite storage for ScamCheck.

WEEK 2 GOAL: move the examples from data/seed_patterns.py into a real
SQLite database, so the app reads patterns/examples from the DB instead of
a hardcoded Python list.

SQLite is built into Python via the `sqlite3` module — no separate install
or server needed. The database will just be a file (e.g. scamcheck.db) that
gets created the first time you run this.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "scamcheck.db"


def get_connection() -> sqlite3.Connection:
    """
    Return a connection to the SQLite database, creating the file if it
    doesn't exist yet.

    TODO: this part is mostly done for you — sqlite3.connect() creates the
    file automatically if it's not there. You shouldn't need to change much
    here, but make sure DB_PATH points somewhere sensible.
    """
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    """
    Create the table(s) ScamCheck needs, if they don't already exist.

    TODO: design a table (suggested name: `patterns`) with columns for at
    least: an id, the example text, a label ("scam" or "safe"), and notes.
    Use "CREATE TABLE IF NOT EXISTS ..." so this is safe to call every time
    the app starts.
    """
    connection = get_connection()
    cursor = connection.cursor()
    
    query = """CREATE TABLE IF NOT EXISTS patterns(
                   id INTEGER PRIMARY KEY,
                   text TEXT NOT NULL UNIQUE,
                   label TEXT NOT NULL CHECK (label in ('scam', 'safe')),
                   notes TEXT NOT NULL
               )"""
    
    cursor.execute(query)
    
    connection.commit()
    
    connection.close()
    
    
def seed_from_examples(examples: list[dict]) -> None:
    """
    Insert the starter examples (from data/seed_patterns.py) into the
    database. Only needs to run once — think about how you'll avoid
    inserting duplicates if this gets called more than once.

    TODO: loop through `examples` and INSERT each one into your table.
    """
    connection = get_connection()
    cursor = connection.cursor()
    
    query = "INSERT OR IGNORE INTO patterns (text, label, notes) VALUES (?, ?, ?)"
    
    for seed in examples:
        
        text = seed["text"]
        label = seed["label"]
        notes = seed["notes"]
        
        cursor.execute(query, (text, label, notes))
        
    connection.commit()
    
    connection.close()         


def get_all_patterns() -> list[dict]:
    """
    Return every row from the patterns table as a list of dicts, so the
    rest of the app doesn't need to know anything about SQL.

    TODO: SELECT * from your table, and convert each row into a dict with
    the same keys as the examples in seed_patterns.py.
    """
    connection = get_connection()
    cursor = connection.cursor()
    
    query = "SELECT * FROM patterns"
    
    cursor.execute(query)
    
    rows = cursor.fetchall()
    
    patterns = []
    
    for row in rows:
        pattern = {"text" : row[1], "label" : row[2], "notes" : row[3]}
        patterns.append(pattern)
    
    connection.close()
    
    return patterns



def add_reported_scam(text: str, notes: str = "") -> None:
    """
    OPTIONAL / LATER PHASE: lets a user "report" a new scam example, which
    gets added to the database. Not required for the demo — this is here
    as a preview of where the project goes if the demo succeeds (community
    scam reporting).
    """
    raise NotImplementedError("Not required for the demo phase")


if __name__ == "__main__":
    # Quick manual test — run `python src/db.py` once db.py is implemented
    # to set up and seed your database.
    import sys
    sys.path.append(str(Path(__file__).parent.parent))
    from data.seed_patterns import SEED_EXAMPLES

    init_db()
    seed_from_examples(SEED_EXAMPLES)
    print(f"Seeded {len(get_all_patterns())} patterns into {DB_PATH}")
