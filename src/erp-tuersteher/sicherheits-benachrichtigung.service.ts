// src/erp-tuersteher/sicherheits-benachrichtigung.service.ts
//
// Sendet an die separat hinterlegte sicherheitsEmail des Lizenznehmers —
// bewusst NICHT an die Login-E-Mail und NICHT über einen Q7-internen
// Posteingang (siehe Diskussion: Q7 gilt im Bedrohungsmodell als
// potenziell kompromittiert, darf also kein alleiniger Kanal sein).
//
// SMTP-Zugangsdaten fehlen aktuell noch — siehe README, Punkt "Offen".

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SicherheitsBenachrichtigungService {
  private readonly logger = new Logger(SicherheitsBenachrichtigungService.name);

  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  async sendeVerdachtsmeldung(params: {
    sicherheitsEmail: string;
    lizenznehmerName: string;
    ipAdresse: string;
    zeitpunkt: Date;
    grund: string;
  }): Promise<void> {
    const { sicherheitsEmail, lizenznehmerName, ipAdresse, zeitpunkt, grund } = params;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'sicherheit@q7-erp.de',
        to: sicherheitsEmail,
        subject: `Q7-ERP: Verdächtige Anfrage bei ${lizenznehmerName}`,
        text:
          `Es wurde eine verdächtige Anfrage an euer Q7-ERP-System erkannt.\n\n` +
          `Zeitpunkt: ${zeitpunkt.toLocaleString('de-DE')}\n` +
          `IP-Adresse: ${ipAdresse}\n` +
          `Grund: ${grund}\n\n` +
          `Falls das nicht von euch/eurem Q7-System veranlasst wurde, meldet euch umgehend beim Support.`,
      });
    } catch (error) {
      // Fehlschlag beim Mailversand darf den Türsteher nicht blockieren —
      // die eigentliche Sicherheitsentscheidung (blockieren/erlauben) ist
      // bereits getroffen, bevor diese Methode aufgerufen wird.
      this.logger.error(`Sicherheits-E-Mail konnte nicht gesendet werden: ${error}`);
    }
  }
}
