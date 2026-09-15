// src/common/crypto/verschluesselung.service.ts
// NEU (Aufgabe 25) — Verschlüsselung at-rest für sensible Felder,
// aktuell konkret: q7_verbindung.geteiltesGeheimnis
//
// Verfahren: AES-256-GCM (authentifizierte Verschlüsselung — verhindert
// nicht nur das Lesen, sondern auch unbemerktes Verändern des Werts).
// Der Master-Schlüssel liegt NICHT in der Datenbank, sondern nur in der
// Umgebungsvariable ENCRYPTION_KEY (.env, analog zu JWT_SECRET).
//
// Speicherformat in der DB (ein einziges String-Feld, kein Schema-Wechsel
// nötig): "iv:authTag:ciphertext", alle drei Teile hex-kodiert.

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHMUS = 'aes-256-gcm';
const IV_LAENGE_BYTES = 12; // empfohlene IV-Länge für GCM

@Injectable()
export class VerschluesselungService {
  private readonly schluessel: Buffer;

  constructor() {
    const hexSchluessel = process.env.ENCRYPTION_KEY;
    if (!hexSchluessel || hexSchluessel.length !== 64) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY fehlt oder hat nicht die erwartete Länge (64 Hex-Zeichen = 32 Byte).',
      );
    }
    this.schluessel = Buffer.from(hexSchluessel, 'hex');
  }

  verschluesseln(klartext: string): string {
    const iv = randomBytes(IV_LAENGE_BYTES);
    const cipher = createCipheriv(ALGORITHMUS, this.schluessel, iv);

    const verschluesselt = Buffer.concat([
      cipher.update(klartext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('hex'), authTag.toString('hex'), verschluesselt.toString('hex')].join(':');
  }

  entschluesseln(gespeichertesFormat: string): string {
    const teile = gespeichertesFormat.split(':');
    if (teile.length !== 3) {
      throw new InternalServerErrorException(
        'Verschlüsselter Wert hat unerwartetes Format — nicht mit diesem Dienst verschlüsselt?',
      );
    }
    const [ivHex, authTagHex, ciphertextHex] = teile;

    const decipher = createDecipheriv(ALGORITHMUS, this.schluessel, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const entschluesselt = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, 'hex')),
      decipher.final(),
    ]);

    return entschluesselt.toString('utf8');
  }
}
