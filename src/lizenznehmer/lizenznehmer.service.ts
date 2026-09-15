// src/lizenznehmer/lizenznehmer.service.ts
//
// Referenz-Beispiel für das Kapselungsprinzip (Master-Dok 3.1):
// Kein Controller/anderer Service ruft je `prisma.lizenznehmer...` direkt
// auf — immer nur über diese Klasse. Technologie-Wechsel (z.B. anderes ORM)
// würde künftig nur hier ansetzen, nicht verstreut im Code.
//
// Wichtig: lizenznehmer ist die Wurzeltabelle, hat keine lizenznehmerId und
// keine RLS-Policy — darum PrismaService (ohne Tenant-Kontext), nicht
// PrismaTenantService. Jeder Service für eine "normale" Tabelle (Partner,
// Artikel, Konten, ...) MUSS stattdessen PrismaTenantService nutzen, siehe
// Beispiel in artikel.service.ts / lizenznehmer.service.example.ts.

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLizenznehmerDto } from './create-lizenznehmer.dto';

@Injectable()
export class LizenznehmerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLizenznehmerDto) {
    return this.prisma.lizenznehmer.create({ data: dto });
  }

  async findAll() {
    return this.prisma.lizenznehmer.findMany();
  }

  async findOne(id: string) {
    const lizenznehmer = await this.prisma.lizenznehmer.findUnique({ where: { id } });
    if (!lizenznehmer) {
      throw new NotFoundException(`Lizenznehmer ${id} nicht gefunden.`);
    }
    return lizenznehmer;
  }

  async update(id: string, dto: Partial<CreateLizenznehmerDto>) {
    await this.findOne(id); // wirft 404, falls nicht vorhanden
    return this.prisma.lizenznehmer.update({ where: { id }, data: dto });
  }

  async deaktivieren(id: string) {
    await this.findOne(id);
    return this.prisma.lizenznehmer.update({
      where: { id },
      data: { status: 'INAKTIV' },
    });
  }
}
