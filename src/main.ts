import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
  });

  // A111 (Ansatz 1, Admin-entschieden 20.08.2026):
  // Aktiviert die bereits in den DTOs vorhandenen class-validator-Decorators
  // (z.B. @IsPositive() in WareneingangDto). Vorher wurden diese komplett
  // ignoriert, da NestJS Validierung nicht automatisch durchführt, ohne
  // dass eine ValidationPipe global registriert ist.
  //
  // whitelist: true          -> entfernt Felder aus dem Request-Body, die
  //                              NICHT im DTO definiert sind (z.B. versehentlich
  //                              mitgeschicktes "extraFeld")
  // forbidNonWhitelisted: true -> lehnt den Request ab (400), statt das
  //                              unbekannte Feld nur still zu entfernen —
  //                              macht Tippfehler im Frontend sofort sichtbar
  //                              statt sie unbemerkt verschwinden zu lassen
  // transform: true           -> wandelt z.B. Query-Parameter/Body-Strings
  //                              automatisch in die im DTO deklarierten Typen
  //                              um (relevant u.a. für "menge" als number)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // A111: Einheitliches Fehlerformat für alle Antworten (siehe
  // all-exceptions.filter.ts für Details und Begründung).
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
