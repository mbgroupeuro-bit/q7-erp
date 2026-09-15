import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * A111 — Globaler Exception-Filter (Ansatz 1, Admin-entschieden 20.08.2026).
 *
 * Zweck: Bringt JEDE Fehlerantwort (egal ob NestJS-Standard-Exception wie
 * BadRequestException/NotFoundException oder unerwarteter Server-Fehler)
 * in ein einheitliches JSON-Format. Ändert NICHT die bestehenden
 * throw new BadRequestException('...')-Aufrufe im Code (siehe LagerService
 * etc.) — die Nachrichtentexte bleiben exakt wie bisher, nur die
 * Antwortstruktur drumherum wird vereinheitlicht.
 *
 * Einheitliches Format:
 * {
 *   statusCode: number,
 *   message: string,       // bestehender Text aus der Exception, unverändert
 *   error: string,         // z.B. "Bad Request", "Not Found"
 *   timestamp: string,     // ISO-Zeitstempel
 *   path: string           // aufgerufene Route, hilfreich beim Debuggen
 * }
 *
 * Frontend-Kompatibilität: bestehende Seiten lesen aktuell "data?.message"
 * (siehe WarenausgangPage) — das Feld "message" bleibt an derselben Stelle
 * im JSON, keine bestehende Frontend-Seite muss wegen dieses Filters
 * geändert werden.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Interner Serverfehler.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response_ = exception.getResponse();

      if (typeof response_ === 'string') {
        message = response_;
        error = exception.name;
      } else if (typeof response_ === 'object' && response_ !== null) {
        // ValidationPipe liefert message als Array (eine Zeile je verletzter Regel)
        const body = response_ as { message?: string | string[]; error?: string };
        message = body.message ?? exception.message;
        error = body.error ?? exception.name;
      }
    } else if (exception instanceof Error) {
      // Unerwarteter, nicht als HttpException geworfener Fehler — bewusst
      // KEINE internen Details (Stacktrace, DB-Fehlermeldung) an den Client
      // durchreichen, nur generische Meldung. Details landen im Server-Log.
      // eslint-disable-next-line no-console
      console.error('Unerwarteter Fehler:', exception);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
