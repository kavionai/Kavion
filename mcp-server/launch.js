const originalEmitWarning = process.emitWarning.bind(process);

process.emitWarning = (warning, ...args) => {
  const message =
    typeof warning === 'string'
      ? warning
      : typeof warning?.message === 'string'
        ? warning.message
        : '';
  const warningType =
    typeof args[0] === 'string'
      ? args[0]
      : typeof warning?.name === 'string'
        ? warning.name
        : '';

  if (warningType === 'ExperimentalWarning' && message.includes('SQLite is an experimental feature')) {
    return;
  }

  return originalEmitWarning(warning, ...args);
};

await import('./index.js');
