import { IsUUID } from 'class-validator';

export class CreateKonfigurationsregelDto {
  @IsUUID()
  dannAusschlussOptionId: string; // ID der BausteinOption, die bei Auswahl der wenn-Option ausgeschlossen wird

  // NEU (A115-Vorlauf, 21.08.2026): Gleicher A111-Regressionsfehler wie bei
  // CreatePartnerDto/CreateArtikelDto — Decorators nachgerüstet.
}
