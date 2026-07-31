import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  health(): { data: { status: 'ok'; service: 'api' } } {
    return { data: { status: 'ok', service: 'api' } };
  }
}
