import sys
sys.path.insert(0,'ClassLoop/backend')
from app.database import connect
c=connect()
for r in c.execute('select id,filename,graph_status,graph_error from learning_documents order by created_at desc limit 10').fetchall(): print(dict(r))
