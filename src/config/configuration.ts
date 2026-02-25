export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  ai: {
    provider: process.env.AI_PROVIDER ?? 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL ?? 'gpt-4o',
  },

  worker: {
    enabled: process.env.WORKER_ENABLED !== 'false',
    concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10),
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? '1000', 10),
    lockTimeoutMinutes: parseInt(process.env.WORKER_LOCK_TIMEOUT_MINUTES ?? '10', 10),
  },

  job: {
    baseDelayMs: parseInt(process.env.JOB_BASE_DELAY_MS ?? '5000', 10),
    maxAttempts: parseInt(process.env.JOB_MAX_ATTEMPTS ?? '3', 10),
  },

  scheduler: {
    enabled: process.env.SCHEDULER_ENABLED !== 'false',
    pollIntervalMs: parseInt(process.env.SCHEDULER_POLL_INTERVAL_MS ?? '60000', 10),
  },

  enrichment: {
    apiUrl: process.env.ENRICHMENT_API_URL,
    apiKey: process.env.ENRICHMENT_API_KEY,
  },

  intelligence: {
    buyingSignalThreshold: parseInt(process.env.BUYING_SIGNAL_THRESHOLD ?? '75', 10),
    ghostRiskSilenceDays: parseInt(process.env.GHOST_RISK_SILENCE_DAYS ?? '7', 10),
    dealDecayThresholdDays: parseInt(process.env.DEAL_DECAY_THRESHOLD_DAYS ?? '14', 10),
  },

  n8n: {
    webhooks: {
      outreachDirectCall: process.env.N8N_WEBHOOK_OUTREACH_DIRECT ?? '',
      outreachCold: process.env.N8N_WEBHOOK_OUTREACH_COLD ?? '',
      nurture: process.env.N8N_WEBHOOK_NURTURE ?? '',
      onboarding: process.env.N8N_WEBHOOK_ONBOARDING ?? '',
      renewalReminder: process.env.N8N_WEBHOOK_RENEWAL_REMINDER ?? '',
      proposalBlueprint: process.env.N8N_WEBHOOK_PROPOSAL_BLUEPRINT ?? '',
      testimonial: process.env.N8N_WEBHOOK_TESTIMONIAL ?? '',
      referral: process.env.N8N_WEBHOOK_REFERRAL ?? '',
      upsell: process.env.N8N_WEBHOOK_UPSELL ?? '',
      leads: process.env.N8N_WEBHOOK_LEADS ?? '',
      deals: process.env.N8N_WEBHOOK_DEALS ?? '',
    },
  },
});
