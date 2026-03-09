type LogLevel = 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

function log(level: LogLevel, service: string, fields: LogFields, message: string) {
  console.log(JSON.stringify({ level, service, message, ts: new Date().toISOString(), ...fields }));
}

export function createLogger(service: string) {
  return {
    info: (fields: LogFields, message: string) => log('info', service, fields, message),
    warn: (fields: LogFields, message: string) => log('warn', service, fields, message),
    error: (fields: LogFields, message: string) => log('error', service, fields, message),
  };
}
