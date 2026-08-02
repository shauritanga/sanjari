import { Injectable } from '@nestjs/common';

type RequestMetric = { count: number; durationMs: number };

@Injectable()
export class MetricsService {
  private readonly requests = new Map<string, RequestMetric>();

  recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    const key = `${method} ${normalizePath(path)} ${Math.floor(statusCode / 100)}xx`;
    const current = this.requests.get(key) ?? { count: 0, durationMs: 0 };
    current.count += 1;
    current.durationMs += durationMs;
    this.requests.set(key, current);
  }

  render(): string {
    const lines = [
      '# HELP sanjari_http_requests_total Total HTTP requests handled by the API.',
      '# TYPE sanjari_http_requests_total counter',
      '# HELP sanjari_http_request_duration_ms_total Total request duration in milliseconds.',
      '# TYPE sanjari_http_request_duration_ms_total counter',
    ];
    for (const [key, metric] of this.requests) {
      const [method, path, statusClass] = key.split(' ');
      const labels = `method="${method}",path="${path}",status_class="${statusClass}"`;
      lines.push(`sanjari_http_requests_total{${labels}} ${metric.count}`);
      lines.push(`sanjari_http_request_duration_ms_total{${labels}} ${metric.durationMs}`);
    }
    return `${lines.join('\n')}\n`;
  }
}

function normalizePath(path: string): string {
  return path.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,36}(?=\/|$)/gi, '/:id').replace(/\/\d+(?=\/|$)/g, '/:id');
}
