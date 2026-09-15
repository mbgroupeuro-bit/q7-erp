import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateBausteinGruppeDto {
  @IsString()
  @IsNotEmpty()
  gruppenName: string;

  @IsOptional()
  @IsBoolean()
  pflichtfeld?: boolean; // optional — bei undefined greift Prisma-Default (true)

  // NEU (A115-Vorlauf, 21.08.2026): Gleicher A111-Regressionsfehler wie bei
  // CreatePartnerDto/CreateArtikelDto — Decorators nachgerüstet.
}
