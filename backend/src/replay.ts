import fs from 'fs';
import path from 'path';
import { app } from './server';

async function runReplay() {
  const recordingPath = path.join(__dirname, '../../reference_recording.jsonl');
  if (!fs.existsSync(recordingPath)) {
    console.error('Nu gasesc reference_recording.jsonl la:', recordingPath);
    return;
  }

  await app.inject({ method: 'POST', url: '/test/reset' });

  const lines = fs.readFileSync(recordingPath, 'utf8').split('\n').filter(l => l.trim().length > 0);
  console.log(`Pornesc testul pe cele ${lines.length} request-uri...`);

  let passed = 0;
  for (let i = 0; i < lines.length; i++) {
    const item = JSON.parse(lines[i]);
    const headers: Record<string, string> = {};
    if (item.x_now) headers['x-now'] = item.x_now;

    const res = await app.inject({
      method: item.method,
      url: item.path,
      headers,
      payload: item.body
    });

    if (res.statusCode !== item.status) {
      console.error(`Linia ${i + 1} ESUAT: Status ${res.statusCode} vs asteptat ${item.status}`);
      process.exit(1);
    }
    passed++;
  }

  console.log(`SUCCES TOTAL: Toate cele ${passed}/${lines.length} de cereri s-au potrivit 100%!`);
  process.exit(0);
}

runReplay();