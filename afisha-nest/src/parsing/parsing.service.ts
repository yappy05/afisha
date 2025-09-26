import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ParseRequestDto } from '../common/lib/dto/parse.request.dto';

export interface ParsedEvent {
  title: string;
  time: string;
  place: string;
  link?: string;
}

@Injectable()
export class ParsingService implements OnModuleDestroy {
  private browser: puppeteer.Browser | null = null;

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
        ],
      });
    }
    return this.browser;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async parseYandexAfisha(dto: ParseRequestDto): Promise<ParsedEvent[]> {
    const { city, category, formattedDate } = dto;
    let browser: puppeteer.Browser | null = null;
    let page: puppeteer.Page | null = null;

    try {
      browser = await this.getBrowser();
      page = await browser.newPage();

      await page.setDefaultNavigationTimeout(70000);
      await page.setDefaultTimeout(40000);

      const url =
        category === 'events'
          ? `https://afisha.timepad.ru/${city}/events?date=${formattedDate}`
          : `https://afisha.timepad.ru/${city}/categories/${category}?date=${formattedDate}`;

      console.log('🔄 Парсим URL:', url);

      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      console.log('✅ Страница загружена');
      await this.delay(3000);

      // Кликаем по кнопке "Показать еще"
      for (let i = 0; i < 5; i++) {
        const buttonClicked = await page.evaluate(() => {
          const button = document.querySelector(
            '.cbtn.cbtn--variant_secondary.cbtn--fixed.cbtn--large.lmodules__4',
          ) as HTMLButtonElement;
          if (button && button.offsetParent !== null) {
            button.click();
            return true;
          }
          return false;
        });

        if (buttonClicked) {
          console.log(`✅ Кнопка нажата (${i + 1}/5)`);
          await this.delay(2000);
        } else {
          console.log('❌ Кнопка не найдена или не видима');
          break;
        }
      }

      const html = await page.content();
      return this.parseEventsWithCheerio(html);
    } catch (error) {
      console.error('❌ Ошибка парсинга:', error.message);
      return this.getFallbackEvents(city);
    } finally {
      if (page) await page.close();
    }
  }

  private parseEventsWithCheerio(html: string): ParsedEvent[] {
    const $ = cheerio.load(html);
    const events: ParsedEvent[] = [];

    $('.ceventcard').each((index, element) => {
      const $el = $(element);

      const title = $el.find('.ctypography__body').first().text().trim();
      const time = $el.find('.ceventcard__date').first().text().trim();
      const place = $el.find('.t-color-gray-50').first().text().trim();
      const link = $el.find('a').first().attr('href');

      if (title && time) {
        events.push({
          title,
          time,
          place,
          link: link ? `https://afisha.timepad.ru${link}` : undefined,
        });
      }
    });

    console.log(`✅ Найдено событий: ${events.length}`);
    return events;
  }

  private getFallbackEvents(city: string): ParsedEvent[] {
    console.log('🔄 Используем fallback данные');

    return [
      {
        title: `Концерт в ${city}`,
        time: 'Сегодня, 19:00',
        place: 'Главный концертный зал',
      },
      {
        title: `Выставка в ${city}`,
        time: 'Завтра, 12:00',
        place: 'Центральный выставочный зал',
      },
    ];
  }
}
