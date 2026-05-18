import Redis from 'ioredis';

export class RedisStore {
  constructor(private redis: Redis) {}

  set(sessionId: string, session: any, callback: (err?: any) => void) {
    this.redis.set(sessionId, JSON.stringify(session), 'EX', 86400)
      .then(() => callback())
      .catch(callback);
  }

  get(sessionId: string, callback: (err: any, result?: any) => void) {
    this.redis.get(sessionId)
      .then((data) => {
        if (!data) return callback(null, null);
        callback(null, JSON.parse(data));
      })
      .catch(callback);
  }

  destroy(sessionId: string, callback: (err?: any) => void) {
    this.redis.del(sessionId)
      .then(() => callback())
      .catch(callback);
  }
}