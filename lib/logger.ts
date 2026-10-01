type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel = (): Level => {
  const env = (process.env.LOG_LEVEL || '').toLowerCase();
  if (env in LEVEL_WEIGHT) return env as Level;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

const serialize = (value: unknown): unknown => {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
};

function write(level: Level, event: string, context: Record<string, unknown> = {}) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel()]) return;
  if (process.env.NODE_ENV === 'test') return;

  const ctx = Object.fromEntries(Object.entries(context).map(([k, v]) => [k, serialize(v)]));
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (process.env.NODE_ENV === 'production') {
    sink(JSON.stringify({ ts: new Date().toISOString(), level, event, ...ctx }));
  } else {
    sink(`[${level}] ${event}`, Object.keys(ctx).length ? ctx : '');
  }
}

/** Structured logger: JSON lines in production, readable output in development. */
export const logger = {
  debug: (event: string, ctx?: Record<string, unknown>) => write('debug', event, ctx),
  info: (event: string, ctx?: Record<string, unknown>) => write('info', event, ctx),
  warn: (event: string, ctx?: Record<string, unknown>) => write('warn', event, ctx),
  error: (event: string, ctx?: Record<string, unknown>) => write('error', event, ctx),
};
