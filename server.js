require('dotenv').config()
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const {connectMongo, connectRedis, redisClient} = require('./config/database');
const mongoose = require("mongoose");
const https = require('https');
const fs = require('fs');
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.static('public'))

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

const eventSchema = new mongoose.Schema({
    city: String,
    title: String,
    date: String,
    place: String,
    description: String
}, {timestamps: true})

const Event = mongoose.model('Event', eventSchema)

async function parseYandexAfisha(city) {
    const cityMap = {
        'москва': 'moscow',
        'санкт-петербург': 'spb',
        'спб': 'spb'
    }

    const citySlug = cityMap[city.toLowerCase()];
    if (!citySlug) throw new Error('Город не поддерживается');

    const url = `https://afisha.yandex.ru/${citySlug}`;

    try {
        const {data} = await axios.get(url);
        const $ = cheerio.load(data);
        const events = [];

        // Парсим события (упрощенные селекторы)
        $('.event-event').each((i, el) => {
            const $el = $(el);
            events.push({
                title: $el.find('.event-event__title').text() || 'Без названия',
                date: $el.find('.event-event__date').text() || 'Дата не указана',
                place: $el.find('.event-event__place').text() || 'Место не указано',
                description: $el.find('.event-event__description').text() || 'Описание отсутствует'
            });
        });

        if (events.length === 0) return getFallbackEvents(city)
        return events.slice(0, 10); // Ограничиваем 10 событиями
    } catch (error) {
        return getFallbackEvents(city)
    }
}

function getFallbackEvents(city) {
    console.log(city)
    const cityLower = city.toLowerCase()

    if (cityLower.includes('москва')) {
        return [
            {
                title: "🎭 Концерт симфонического оркестра",
                date: "Сегодня, 19:00",
                place: "Большой театр",
                description: "Произведения Чайковского и Рахманинова"
            },
            {
                title: "🎨 Выставка современного искусства",
                date: "Завтра, 12:00-20:00",
                place: "Третьяковская галерея",
                description: "Работы современных российских художников"
            },
            {
                title: "🎬 Кинофестиваль",
                date: "20 декабря, 18:30",
                place: "Кинотеатр 'Октябрь'",
                description: "Премьерные показы новых фильмов"
            },
            {
                title: "🎪 Цирковое представление",
                date: "21 декабря, 15:00",
                place: "Большой Московский цирк",
                description: "Шоу с участием лучших артистов"
            },
            {
                title: "🎼 Джазовый вечер",
                date: "22 декабря, 20:00",
                place: "Клуб 'Игорь Бутман'",
                description: "Выступления известных джазовых коллективов"
            }
        ]
    }

    if (cityLower.includes('петербург') || cityLower.includes('спб')) {
        return [
            {
                title: "🎭 Балет 'Лебединое озеро'",
                date: "Сегодня, 19:30",
                place: "Мариинский театр",
                description: "Классическая постановка Чайковского"
            },
            {
                title: "🎨 Выставка Эрмитажа",
                date: "Завтра, 10:00-18:00",
                place: "Государственный Эрмитаж",
                description: "Шедевры из коллекции музея"
            },
            {
                title: "🎵 Органный концерт",
                date: "20 декабря, 17:00",
                place: "Петербургская филармония",
                description: "Произведения Баха и Моцарта"
            },
            {
                title: "🎭 Спектакль 'Ревизор'",
                date: "21 декабря, 19:00",
                place: "Александринский театр",
                description: "Классическая постановка по Гоголю"
            },
            {
                title: "🎻 Вечер камерной музыки",
                date: "22 декабря, 18:00",
                place: "Малый зал филармонии",
                description: "Произведения для струнного квартета"
            }
        ]
    }

    // Заглушка для других городов
    return [
        {
            title: `Концерт в ${city}`,
            date: "Сегодня, 19:00",
            place: "Главный концертный зал",
            description: "Интересное мероприятие в вашем городе"
        },
        {
            title: `Выставка в ${city}`,
            date: "Завтра, 12:00",
            place: "Центральный выставочный зал",
            description: "Посетите выставку местных художников"
        }
    ]
}

async function getAfishaWithCache(city) {
    const CACHE_TTL = 3600; // 1 час
    const cityNormalized = city.toLowerCase(); // Нормализуем город

    // 1. Пробуем получить из Redis
    try {
        const cached = await redisClient.get(`afisha:${cityNormalized}`);
        if (cached) {
            console.log('📦 Данные из Redis');
            return JSON.parse(cached);
        }
    } catch (error) {
        console.log('Redis недоступен');
    }

    // 2. Пробуем получить из MongoDB
    try {
        const oneHourAgo = new Date(Date.now() - 3600000); // 1 час назад
        console.log('🔍 Ищем в MongoDB для города:', cityNormalized);

        const cachedEvents = await Event.find({
            city: cityNormalized, // Используем нормализованный город
            createdAt: {$gt: oneHourAgo}
        }).limit(10);

        console.log('📊 Найдено событий в MongoDB:', cachedEvents.length);

        if (cachedEvents.length > 0) {
            console.log('💾 Данные из MongoDB');
            const events = cachedEvents.map(e => ({
                title: e.title,
                date: e.date,
                place: e.place,
                description: e.description
            }));

            // Сохраняем в Redis на будущее
            try {
                await redisClient.setEx(`afisha:${cityNormalized}`, CACHE_TTL, JSON.stringify(events));
                console.log('✅ Данные сохранены в Redis');
            } catch (error) {
                console.log('Не удалось сохранить в Redis');
            }

            return events;
        }
    } catch (error) {
        console.log('❌ MongoDB недоступен:', error.message);
    }

    // 3. Парсим новые данные
    console.log('🔄 Парсим новые данные для города:', cityNormalized);
    const events = await parseYandexAfisha(city);

    // Сохраняем в MongoDB
    try {
        console.log('💾 Сохраняем в MongoDB:', events.length, 'событий');
        await Event.deleteMany({city: cityNormalized}); // Удаляем старые

        const eventsToSave = events.map(event => ({
            ...event,
            city: cityNormalized, // Сохраняем с нормализованным городом
            createdAt: new Date() // Явно указываем дату
        }));

        await Event.insertMany(eventsToSave);
        console.log('✅ Данные успешно сохранены в MongoDB');

        // Проверим что сохранилось
        const savedCount = await Event.countDocuments({city: cityNormalized});
        console.log('📊 Проверка: в MongoDB теперь', savedCount, 'событий для', cityNormalized);

    } catch (error) {
        console.log('❌ Не удалось сохранить в MongoDB:', error.message);
    }

    // Сохраняем в Redis
    try {
        await redisClient.setEx(`afisha:${cityNormalized}`, CACHE_TTL, JSON.stringify(events));
        console.log('✅ Данные сохранены в Redis');
    } catch (error) {
        console.log('❌ Не удалось сохранить в Redis:', error.message);
    }

    return events;
}

app.get('/api/afisha', async (req, res) => {
    console.log('get aifhs')
    try {
        const city = req.query.city;
        if (!city) return res.status(400).json({error: 'Укажите город'});
        const events = await getAfishaWithCache(city)
        res.json({city, events})
    } catch (error) {
        res.status(400).json({error: 'Укажите город'});
    }
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/test', (req, res) => {
    res.json({message: 'Сервер работает!!', timestamp: new Date()})
})

async function startServer() {
    await connectMongo();
    await connectRedis();

    // const sslOptions = {
    //     key: fs.readFileSync('localhost+2-key.pem'),
    //     cert: fs.readFileSync('localhost+2.pem')
    // };
    //
    // const httpsServer = https.createServer(sslOptions, app);
    //
    // httpsServer.listen(PORT, () => {
    //     console.log(`TTPS сервер запущен на https://localhost:${PORT}`);
    // });

    app.listen(PORT || 30000)

    if (process.env.REDIRECT_HTTP === 'true') {
        const http = require('http');
        const httpApp = express();

        httpApp.use((req, res) => {
            res.redirect(`https://localhost:${PORT}${req.url}`);
        });

        http.createServer(httpApp).listen(3001, () => {
            console.log(`🔄 HTTP редирект на порту 3001`);
        });
    }
}

startServer().catch(console.error);