import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

@Controller({ path: 'catalog', version: '1' })
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('locations')
  async locations() {
    const countries = await this.prisma.country.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { cities: { where: { active: true }, orderBy: { name: 'asc' } } },
    });
    return {
      data: countries.map((country) => ({
        code: country.code,
        name: country.name,
        cities: country.cities.map((city) => ({ id: city.id, name: city.name })),
      })),
    };
  }
}
