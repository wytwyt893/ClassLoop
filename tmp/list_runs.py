import sys
sys.path.insert(0, 'ClassLoop/backend')
from app.database import connect
c=connect()
rows=c.execute("select id,flow,status,agent_name,raw_log_path from agent_baseline_runs order by started_at desc limit 3").fetchall()
for row in rows: print(dict(row))
