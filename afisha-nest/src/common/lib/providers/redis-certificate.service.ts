import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RedisCertificateService implements OnModuleInit {
  private readonly certPath = path.join(process.cwd(), 'CA.pem');

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.downloadCertificate();
  }

  private async downloadCertificate(): Promise<void> {
    try {
      if (fs.existsSync(this.certPath)) {
        console.log('[Redis] Сертификат уже существует');
        return;
      }

      console.log('[Redis] Загрузка сертификата Yandex Cloud...');
      const response = await axios.get(
        'https://storage.yandexcloud.net/cloud-certs/CA.pem',
      );
      fs.writeFileSync(this.certPath, response.data);
      console.log('[Redis] Сертификат успешно загружен');
    } catch (error) {
      console.error('[Redis] Ошибка загрузки сертификата:', error);
      throw error;
    }
  }

  getCertificatePath(): string {
    return this.certPath;
  }
}
