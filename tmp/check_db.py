import sys
sys.path.insert(0, 'ClassLoop/backend')
from app.database import init_database, connect
init_database()
c = connect()
print(c.execute("select name from sqlite_master where type='table' and name='agent_baseline_runs'").fetchone()[0])
print([r[1] for r in c.execute('pragma table_info(agent_baseline_runs)').fetchall()])
c.close()
