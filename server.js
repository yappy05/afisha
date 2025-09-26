require('dotenv').config()
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const {connectMongo, connectRedis, redisClient} = require('./config/database');
const mongoose = require("mongoose");
const https = require('https');
const fs = require('fs');
const cors = require('cors')
const puppeteer = require('puppeteer')

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
    title: String,
    time: String,
    place: String,
    link: String
}, {timestamps: true})

const Event = mongoose.model('Event', eventSchema)

async function parseYandexAfisha(city, category, formattedDate) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas'
            ]
        });

        const page = await browser.newPage();

        // Устанавливаем реалистичные таймауты
        await page.setDefaultNavigationTimeout(70000);
        await page.setDefaultTimeout(40000);

        // Блокируем ненужные ресурсы для ускорения
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Блокируем изображения, стили, шрифты для скорости
            if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        let url = ''
        if (category === 'events') {
            url = `https://afisha.timepad.ru/${city}/events?date=${formattedDate}`
        } else {
            url = `https://afisha.timepad.ru/${city}/categories/${category}?date=${formattedDate}`
        }

        // const url = 'https://afisha.timepad.ru/moscow/categories/sport?date=2025-09-26T00%3A00%3A00%2B03%3A00%2C2025-09-26T23%3A59%3A59%2B03%3A00';
        // console.log('Пытаемся загрузить:', url);

        // Пробуем более простое ожидание
        await page.goto(url, {
            waitUntil: 'domcontentloaded', // Быстрее чем networkidle
            timeout: 40000
        });

        console.log('Страница загружена, ищем элемент...');

        // Ждем элемент с коротким таймаутом
        try {
            await page.waitForSelector('.lpage.lflexchild--stretched', {
                timeout: 25000
            });
        } catch (e) {
            console.log('Элемент не найден, но продолжаем...');
        }

        try {
            await page.waitForSelector('h2.ctypography.ctypography--regular.ctypography--no-padding.ctypography__body.tmultiline.tmultiline-3.t-color-black', {
                timeout: 35000
            });
            await p
        } catch (e) {
            console.log('H2 элементы не найдены за 5 секунд, продолжаем...');
        }



        // Все равно пытаемся получить элемент
        // const button = await page.evaluate(() => {
        //     const div = document.querySelector('.cbtn.cbtn--variant_secondary.cbtn--fixed.cbtn--large.lmodules__4');
        //     return div ? div.outerHTML : 'Элемент не найден, но страница загружена';
        // });
        for (let i = 0; i < 2; i++) {
            try {
                console.log(`Попытка ${i + 1}/10`);

                // Ищем кнопку
                const button = await page.$('.cbtn.cbtn--variant_secondary.cbtn--fixed.cbtn--large.lmodules__4');

                if (!button) {
                    console.log('Кнопка не найдена, завершаем');
                    break;
                }

                // Проверяем что кнопка кликабельна
                const isClickable = await button.evaluate(btn => {
                    return btn.offsetParent !== null && !btn.disabled;
                });

                if (!isClickable) {
                    console.log('Кнопка не кликабельна, завершаем');
                    break;
                }

                // Нажимаем
                await button.click();
                console.log(`Нажатие ${i + 1} успешно`);

                // Ждем обновления
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (e) {
                console.log('Ошибка:', e.message);
                break;
            }
        }
        const html = await page.content();
        const $ = cheerio.load(html);
        const events = [];

// Используем более простые селекторы
        $('.ceventcard').each((index, element) => {
            const $el = $(element);

            // Простой селектор для заголовка
            const title = $el.find('.ctypography__body').text().trim();
            const time = $el.find('.ctypography.ctypography--no-padding.ctypography__small.ceventcard__date').text().trim();
            const place = $el.find('.ctypography.ctypography--no-padding.ctypography--no-wrap.ctypography__small.t-color-gray-50').text().trim();
            // Или ищем по атрибутам
            // const title = $el.find('[class*="tmultiline"]').text().trim();

            events.push({
                title: title,
                time,
                place,
                // Добавьте другие поля
                link: $el.find('a').attr('href')
            });
        });

        // for (let i = 0; i < 2; i++) {
        //     await page.waitForSelector('.cbtn.cbtn--variant_secondary.cbtn--fixed.cbtn--large.lmodules__4', {
        //         timeout: 30000
        //     });
        //     await page.waitForTimeout(60000);
        //     console.log(`Успешное нажатие ${clickCount}`);
        // }
        // await page.click('.cbtn.cbtn--variant_secondary.cbtn--fixed.cbtn--large.lmodules__4');

        await browser.close();

        return{
            success: true,
            // button: button,
            elementsCount: events.length,
            elements: events
        };

    } catch (error) {
        console.error('Ошибка:', error.message);
        if (browser) await browser.close();
        return{ error: error.message };
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

async function getAfishaWithCache(city, category, formattedDate) {
    const CACHE_TTL = 3600; // 1 час
    const cityNormalized = city.toLowerCase();


    try {
        const cached = await redisClient.get(`afisha:${cityNormalized}:${category}:${formattedDate}`);
        if (cached) {
            console.log('📦 Данные из Redis');
            // console.log(cached)
            return JSON.parse(cached);
        }
    } catch (error) {
        console.log('Redis недоступен');
    }

    try {
        const oneHourAgo = new Date(Date.now() - 3600000);
        console.log('🔍 Ищем в MongoDB для города:', cityNormalized);

        const cachedEvents = await Event.find({
            city: city,
            category: category,
            formattedDate: formattedDate,
            createdAt: {$gt: oneHourAgo}
        }).limit(10);

        console.log('📊 Найдено событий в MongoDB:', cachedEvents.length);

        if (cachedEvents.length > 0) {
            console.log('💾 Данные из MongoDB');
            const events = cachedEvents.map(e => ({
                city: e.title,
                date: e.date,
                place: e.place,
                description: e.description
            }));

            try {
                await redisClient.setEx(`afisha:${cityNormalized}:${category}:${formattedDate}`, CACHE_TTL, JSON.stringify(events));
                console.log('✅ Данные сохранены в Redis');
            } catch (error) {
                console.log('Не удалось сохранить в Redis');
            }

            return events;
        }
    } catch (error) {
        console.log('❌ MongoDB недоступен:', error.message);
    }


    console.log('Парсим новые данные для города:', cityNormalized);
    const result = await parseYandexAfisha(city, category, formattedDate);
    const events = result.elements;

    try {
        console.log('Сохраняем в MongoDB:', events.length, 'событий');
        // await Event.deleteMany({city: cityNormalized});

        const eventsToSave = events.map(event => ({
            ...event,
            createdAt: new Date()
        }));

        await Event.insertMany(eventsToSave);
        console.log('Данные успешно сохранены в MongoDB');


        // const savedCount = await Event.countDocuments({title});
        // console.log('Проверка: в MongoDB теперь', savedCount, 'событий для', cityNormalized);

    } catch (error) {
        console.log('Не удалось сохранить в MongoDB:', error.message);
    }

    try {
        await redisClient.setEx(`afisha:${cityNormalized}:${category}:${formattedDate}`, CACHE_TTL, JSON.stringify(events));
        console.log('Данные сохранены в Redis');
    } catch (error) {
        console.log('Не удалось сохранить в Redis:', error.message);
    }

    return events;
}

app.get('/api/afisha', async (req, res) => {
    console.log('get aifhs')
    try {
        const city = req.query.city;
        if (!city) return res.status(400).json({error: 'Укажите город'});
        const events = await getAfishaWithCache(city)
        return res.json({
            success: true,
            city: city,
            elementsCount: elements.length,
            elements: elements
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/test', (req, res) => {
    res.json({message: 'Сервер работает!!', timestamp: new Date()})
})

app.post('/api/parser', async (req, res) => {
    const { city, category, formattedDate } = req.body;
    const result = await getAfishaWithCache(city, category, formattedDate)
    return res.json(result)
});

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
    //     console.log(`TTPS сервер запущен на https://localhost:${PORT}`);1
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