import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_CRON_TASKS = [
  { taskType: 'deal_decay_check', cronExpression: '0 8 * * *' },
  { taskType: 'lead_stale_check', cronExpression: '0 9 * * *' },
  { taskType: 'auto_priority_check', cronExpression: '0 */6 * * *' }, // every 6 hours
  { taskType: 'ghost_risk_recalc', cronExpression: '0 10 * * *' },
  { taskType: 'renewal_reminder', cronExpression: '0 9 * * 1' },
  { taskType: 'weekly_ai_report', cronExpression: '0 8 * * 0' },
  { taskType: 'integrity_watchdog', cronExpression: '0 * * * *' },
];

async function main() {
  console.log('Seeding system cron tasks...');

  await prisma.cronTask.deleteMany({ where: { orgId: null } });

  await prisma.cronTask.createMany({
    data: SYSTEM_CRON_TASKS.map((t) => ({
      taskType: t.taskType,
      cronExpression: t.cronExpression,
      enabled: true,
      nextRunAt: new Date(),
    })),
  });

  console.log(`Seeded ${SYSTEM_CRON_TASKS.length} cron tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
