import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly config: ConfigService) {}

  async trigger(webhookUrl: string, payload: Record<string, unknown>): Promise<void> {
    if (!webhookUrl) {
      this.logger.warn(`Webhook URL not configured — skipping trigger`);
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.warn(`Webhook POST to ${webhookUrl} returned ${response.status}`);
      } else {
        this.logger.log(`Webhook triggered: ${webhookUrl}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook POST failed: ${webhookUrl} — ${message}`);
    }
  }

  getWebhookUrl(key: keyof ReturnType<typeof this.webhooks>): string {
    return this.webhooks()[key];
  }

  private webhooks() {
    return this.config.get<Record<string, string>>('n8n.webhooks') ?? {};
  }
}
