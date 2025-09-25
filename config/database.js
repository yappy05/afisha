const mongoose = require('mongoose')
const redis = require('redis')

const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('MongoDB connected')
    } catch (error) {
        console.error('MongoDB error:', error)
    }
}

const redisClient = redis.createClient({
    url: process.env.REDIS_URL
})

redisClient.on('error', (err) => console.error('Redis error: ', err))
redisClient.on('connect', () => console.log('Redis connected'))
redisClient.on('ready', () => console.log('Redis ready'));

const connectRedis = async () => {
    await redisClient.connect()
}

module.exports = {connectMongo, connectRedis, redisClient}