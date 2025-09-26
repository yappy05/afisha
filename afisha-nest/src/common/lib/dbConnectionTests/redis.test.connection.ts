import Redis from 'ioredis';

export const testRedisConnection = async (redis: Redis) => {
  try {
    await redis.set('test', 'Redis is connected', 'EX', 3000); // Добавлен 'EX' для TTL
    const testValue = await redis.get('test');
    console.log('✅ Redis подключение:', testValue);
  } catch (error) {
    console.error('❌ Ошибка Redis:', error);
  }
};
