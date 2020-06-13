import psycopg2.extras
import config
import collections
import json
import os
import pytz
from datetime import datetime, timedelta

# NOTE: We use one single connection per process, but every function in this module
# creates its own dedicated cursor. This means that these functions should be thread
# safe; psycopg2 has thread-safe connections but not thread-safe cursors.
assert psycopg2.threadsafety >= 2
postgres = psycopg2.connect(config.DATABASE_URI)

# Assumes that dict preserves insertion order (CPython 3.6+, other Python 3.7+, possible 3.5)
# Otherwise, tables might be created in the wrong order, breaking foreign key refs.
TABLES = {
	"users": [
		"twitchid integer primary key",
		"username varchar not null",
		"displayname varchar not null",
	],
	"viewers": [
		"twitchid integer not null references rabbitswatch.users",
		"uid integer not null",
		"displayname varchar not null default ''",
		"tz varchar not null default ''",
		"notes varchar not null default ''",
		"primary key (twitchid, uid)",
	],
}

# https://postgrespro.com/list/thread-id/1544890
# Allow <<DEFAULT>> to be used as a value in an insert statement
class Default(object):
	def __conform__(self, proto):
		if proto is psycopg2.extensions.ISQLQuote: return self
	def getquoted(self): return "DEFAULT"
DEFAULT = Default()
del Default

def create_tables():
	with postgres, postgres.cursor() as cur:
		cur.execute("create schema if not exists rabbitswatch")
		cur.execute("""select table_name, column_name
				from information_schema.columns
				where table_schema = 'rabbitswatch'
				order by ordinal_position""")
		tables = collections.defaultdict(list)
		for table, column in cur:
			tables[table].append(column)
		for table, columns in TABLES.items():
			if table not in tables:
				# Table doesn't exist - create it. Yes, I'm using percent
				# interpolation, not parameterization. It's an unusual case.
				cur.execute("create table rabbitswatch.%s (%s)" % (
					table, ",".join(columns)))
			else:
				# Table exists. Check if all its columns do.
				# Note that we don't reorder columns. Removing works,
				# but inserting doesn't - new columns will be added at
				# the end of the table.
				want = {c.split()[0]: c for c in columns}
				want.pop("primary", None) # Ignore a primary key declaration if altering the table
				have = tables[table]
				need = [c for c in want if c not in have] # Set operations but preserving order to
				xtra = [c for c in have if c not in want] # the greatest extent possible.
				if not need and not xtra: continue # All's well!
				actions = ["add " + want[c] for c in need] + ["drop column " + c for c in xtra]
				cur.execute("alter table rabbitswatch." + table + " " + ", ".join(actions))
create_tables()

def ensure_user(twitchid, username, display):
	with postgres, postgres.cursor() as cur:
		cur.execute("""insert into rabbitswatch.users values (%s, %s, %s)
			on conflict (twitchid) do update set username=excluded.username,
			displayname=excluded.displayname""", [twitchid, username, display])

def update_viewer(twitchid, uid, update):
	if not update: raise ValueError("Gotta update at least one thing") # otherwise it'd bomb in the SQL query
	with postgres, postgres.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
		cur.execute(f"""insert into rabbitswatch.viewers
			(twitchid, uid, {", ".join(update)})
			values (%s, %s{", %s" * len(update)})
			on conflict (twitchid, uid) do update
			set {", ".join(col + "=excluded." + col for col in update)}
			returning *""",
			(twitchid, uid, *update.values()))
		return cur.fetchone()

def get_viewer(twitchid, uid):
	with postgres, postgres.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
		cur.execute("select * from rabbitswatch.viewers where twitchid=%s and uid=%s", (twitchid, uid))
		return cur.fetchall()
