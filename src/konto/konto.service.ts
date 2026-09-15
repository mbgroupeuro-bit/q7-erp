import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../common/tenancy/prisma-tenant.service';
import { CreateKontoDto } from './dto/create-konto.dto';

@Injectable()
export class KontoService extends PrismaTenantService {
  /**
   * Legt ein neues Konto für den aktuellen Lizenznehmer an.
   */
  async create(lizenznehmerId: string, dto: CreateKontoDto) {
    return this.withTenantContext(async (prisma) => {
      return prisma.konto.create({
        data: {
          kontonummer: dto.kontonummer,
          bezeichnung: dto.bezeichnung,
          kontotyp: dto.kontotyp,
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Holt alle Konten des aktuellen Lizenznehmers.
   */
  async findAll(lizenznehmerId: string) {
    return this.withTenantContext(async (prisma) => {
      return prisma.konto.findMany({
        where: {
          lizenznehmerId,
        },
      });
    });
  }

  /**
   * Holt ein einzelnes Konto anhand seiner ID.
   * IDOR-Schutz: Filter auf id + lizenznehmerId (siehe Master-Dokument 3.6).
   */
  async findOne(lizenznehmerId: string, id: string) {
    return this.withTenantContext(async (prisma) => {
      const konto = await prisma.konto.findFirst({
        where: {
          id,
          lizenznehmerId,
        },
      });

      if (!konto) {
        throw new NotFoundException(`Konto mit ID "${id}" wurde nicht gefunden.`);
      }

      return konto;
    });
  }
}
