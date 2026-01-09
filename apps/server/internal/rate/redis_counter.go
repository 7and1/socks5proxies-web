package rate

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisCounter struct {
	client *redis.Client
}

func NewRedisCounter(client *redis.Client) Counter {
	if client == nil {
		return nil
	}
	return &RedisCounter{client: client}
}

func (r *RedisCounter) Incr(ctx context.Context, key string) (int64, error) {
	return r.client.Incr(ctx, key).Result()
}

func (r *RedisCounter) Get(ctx context.Context, key string) (int64, error) {
	val, err := r.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return val, nil
}

func (r *RedisCounter) Set(ctx context.Context, key string, value int64, ttl time.Duration) error {
	return r.client.Set(ctx, key, value, ttl).Err()
}

func (r *RedisCounter) Del(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *RedisCounter) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return r.client.Expire(ctx, key, ttl).Err()
}

// Performance: Atomic increment with expiry using Lua script
// This reduces network round-trips from 2 to 1
var incrWithExpiryScript = redis.NewScript(`
	local current = redis.call('INCR', KEYS[1])
	if current == 1 then
		redis.call('EXPIRE', KEYS[1], ARGV[1])
	end
	return current
`)

func (r *RedisCounter) IncrWithExpiry(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	result, err := incrWithExpiryScript.Run(ctx, r.client, []string{key}, int(ttl.Seconds())).Int64()
	if err != nil {
		return 0, err
	}
	return result, nil
}

func (r *RedisCounter) Close() error {
	if r.client != nil {
		return r.client.Close()
	}
	return nil
}
