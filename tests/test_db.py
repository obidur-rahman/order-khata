"""SQLite storage (docs/05 database schema).

The file is disposable by design: gitignored, ephemeral on the Space, re-seeded at
boot. The test here is about the one way that promise can be broken silently — a
file whose tables were written by an older build.
"""
from __future__ import annotations

import sqlite3

from app import db as app_db


def test_a_database_written_by_an_older_build_is_rebuilt_instead_of_500ing(
    tmp_path, monkeypatch
):
    """`CREATE TABLE IF NOT EXISTS` cannot change a table that already exists, so a
    file from before the schema changed keeps its old shape and the first INSERT
    fails on a column this code no longer writes — a 500 on the customer's message
    instead of a boot error. Seen in the working tree on 2026-10-18 after the cleanup
    removed `conversations.avatar_color`.
    """
    path = tmp_path / "old.db"
    monkeypatch.setenv("ORDER_KHATA_DB", str(path))
    old = sqlite3.connect(path)
    old.executescript(
        """
        CREATE TABLE conversations (
          id TEXT PRIMARY KEY,
          customer_name TEXT NOT NULL,
          avatar_color TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        INSERT INTO conversations VALUES
          ('c_001', 'Rina', '#2F6BFF', '2026-10-17T00:00:00Z');
        """
    )
    old.commit()
    old.close()

    app_db.init_db()  # rebuilds, because the file is disposable seed data

    with sqlite3.connect(path) as conn:
        columns = [row[1] for row in conn.execute("PRAGMA table_info(conversations)")]
    assert "avatar_color" not in columns
    assert app_db.create_conversation("Karim").startswith("c_")  # no 500

    # And a file this build wrote is left alone on the next boot: the rebuild is a
    # repair, not something that quietly wipes the demo inbox every restart.
    cid = app_db.create_conversation("Nadia")
    app_db.init_db()
    assert app_db.get_conversation(cid)["customer_name"] == "Nadia"
