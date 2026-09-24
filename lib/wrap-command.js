export function wrapCommand(command, shell) {
  const script = String(command ?? '');
  if (shell === 'powershell') {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    return {
      command: `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
      stdin: undefined
    };
  }
  return {
    command: '/bin/sh -s',
    stdin: script.endsWith('\n') ? script : `${script}\n`
  };
}
