import { IsEnum } from 'class-validator';

/**
 * D05 — Eingabe zum Ändern des Bestellstatus.
 * BestellStatus ist ein festes Enum (D03, Entscheidung 3), keine
 * konfigurierbare Pipeline wie im CRM-Modul.
 */
export enum BestellStatusInput {
  NEU = 'NEU',
  IN_BEARBEITUNG = 'IN_BEARBEITUNG',
  VERSANDT = 'VERSANDT',
  ABGESCHLOSSEN = 'ABGESCHLOSSEN',
  STORNIERT = 'STORNIERT',
}

export class UpdateBestellungStatusDto {
  @IsEnum(BestellStatusInput)
  status: BestellStatusInput;
}
