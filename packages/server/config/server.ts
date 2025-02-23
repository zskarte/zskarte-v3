import cronTasks from './cron-tasks';
import sea from 'node:sea';

export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  cron: {
    enabled: true,
    tasks: cronTasks,
  },
  logger: {
    startup: {
      enabled: !sea.isSea(), // disable start message
    },
    updates: {
      enabled: !sea.isSea(), // disables update notifications
    },
  },
});
