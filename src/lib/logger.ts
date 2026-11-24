type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel()];
}

export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length < 4) return '****';
  return `${d.slice(0, 4)}***${d.slice(-2)}`;
}

export function createLogger(prefix: string) {
  const tag = prefix.startsWith('[') ? prefix : `[${prefix}]`;

  const write = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    const line = meta ? `${tag} ${message} ${JSON.stringify(meta)}` : `${tag} ${message}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };

  return {
    debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
    info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
  };
}
