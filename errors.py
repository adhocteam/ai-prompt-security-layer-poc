import random
import string
from datetime import datetime, timedelta

def rand_token(n=32):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=n))

start = datetime.utcnow()

with open("error.log", "w") as f:
    for i in range(10000000):
        ts = (start + timedelta(seconds=i)).isoformat() + "Z"
        f.write(
            f'{ts} ERROR request_failed '
            f'Authorization: Bearer {rand_token(40)} '
            f'X-Api-Key: {rand_token(32)} '
            f'api_key={rand_token(24)}&user_id={random.randint(1000,9999)} '
            f'payload={{"token":"{rand_token(48)}","status":"denied"}} '
            f'code=401 request_id=req-{i:04d}\n'
        )
