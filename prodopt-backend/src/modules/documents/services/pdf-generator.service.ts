import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generate(templateName: string, data: any): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;
    
    try {
      // 1. Компиляция шаблона Handlebars
      const templatePath = path.join(process.cwd(), 'templates', 'documents', `${templateName}.hbs`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template ${templateName} not found`);
      }

      const source = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(source);
      const html = template(data);

      // 2. Запуск Puppeteer
      browser = await puppeteer.launch({
        headless: true, // В новых версиях можно использовать "new" или true
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Важно для Docker
      });

      const page = await browser.newPage();
      
      // Устанавливаем контент
      await page.setContent(html, { 
        waitUntil: 'networkidle0' 
      });

      // 3. Генерация PDF
      // Используем Buffer (Uint8Array)
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px',
        },
      });

      return Buffer.from(pdfBuffer);

    } catch (error) {
      this.logger.error(`PDF Generation failed: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}