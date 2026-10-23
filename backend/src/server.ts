import Fastify from 'fastify';
import cors from '@fastify/cors';
import { IANAZone } from 'luxon';
import { db } from './db';
import { getNow, getTimezone, setTimezone, calculateBaseXp, getStats } from './logic';

export const app = Fastify({ logger: false });

app.register(cors, { origin: '*' });

// POST /test/reset
app.post('/test/reset', async (req, reply) => {
  db.prepare('DELETE FROM completions').run();
  db.prepare('DELETE FROM quests').run();
  db.prepare('DELETE FROM meta').run();
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('timezone', 'Europe/Bucharest');
  return reply.status(204).send();
});

// GET /me
app.get('/me', async (req, reply) => {
  const xNow = req.headers['x-now'] as string | undefined;
  const now = getNow(xNow);
  return reply.status(200).send(getStats(now));
});

// PUT /me
app.put('/me', async (req, reply) => {
  const body = req.body as { timezone?: string };
  if (!body || !body.timezone || !IANAZone.isValidZone(body.timezone)) {
    return reply.status(400).send({ error: 'invalid timezone' });
  }
  setTimezone(body.timezone);
  const xNow = req.headers['x-now'] as string | undefined;
  const now = getNow(xNow);
  return reply.status(200).send(getStats(now));
});

// POST /quests
app.post('/quests', async (req, reply) => {
  const body = req.body as any;
  if (!body || typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.length > 100) {
    return reply.status(400).send({ error: 'invalid title' });
  }
  if (!['easy', 'medium', 'hard'].includes(body.difficulty)) {
    return reply.status(400).send({ error: 'invalid difficulty' });
  }
  if (body.due_date && body.recurrence) {
    return reply.status(400).send({ error: 'a quest cannot have both due_date and recurrence' });
  }

  // REPARATIE: Folosim Date.now() pentru ID unic garantat
  const id = `q_${Date.now()}`;
  const xNow = req.headers['x-now'] as string | undefined;
  const now = getNow(xNow);

  db.prepare(`
    INSERT INTO quests (id, title, difficulty, due_date, recurrence, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, body.title, body.difficulty, body.due_date || null, body.recurrence || null, now.toUTC().toISO());

  return reply.status(201).send({
    id,
    title: body.title,
    difficulty: body.difficulty,
    due_date: body.due_date || null,
    recurrence: body.recurrence || null,
    done: false
  });
});

// GET /quests
app.get('/quests', async (req, reply) => {
  const xNow = req.headers['x-now'] as string | undefined;
  const now = getNow(xNow);
  const tz = getTimezone();
  const today = now.setZone(tz).toISODate()!;

  const rows = db.prepare('SELECT * FROM quests ORDER BY created_at DESC, id DESC').all() as any[];

  const result = rows.map(q => {
    let done = false;
    if (q.recurrence === 'daily') {
      const comp = db.prepare(`
        SELECT id FROM completions 
        WHERE quest_id = ? AND day = ? AND undone = 0
      `).get(q.id, today);
      done = !!comp;
    } else {
      const comp = db.prepare(`
        SELECT id FROM completions 
        WHERE quest_id = ? AND undone = 0
      `).get(q.id);
      done = !!comp;
    }
    return {
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      due_date: q.due_date,
      recurrence: q.recurrence,
      done
    };
  });

  return reply.status(200).send(result);
});

// POST /quests/:id/complete
app.post('/quests/:id/complete', async (req, reply) => {
  const { id } = req.params as { id: string };
  const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(id) as any;
  if (!quest) {
    return reply.status(404).send({ error: 'quest not found' });
  }

  const xNow = req.headers['x-now'] as string | undefined;
  const now = getNow(xNow);
  const tz = getTimezone();
  const day = now.setZone(tz).toISODate()!;

  if (quest.recurrence === 'daily') {
    const existing = db.prepare(`
      SELECT * FROM completions 
      WHERE quest_id = ? AND day = ? AND undone = 0
    `).get(id, day) as any;
    if (existing) {
      return reply.status(200).send({
        completion: {
          id: existing.id,
          quest_id: existing.quest_id,
          day: existing.day,
          base_xp: existing.base_xp,
          created_at: existing.created_at
        },
        me: getStats(now)
      });
    }
  } else {
    const existing = db.prepare(`
      SELECT * FROM completions 
      WHERE quest_id = ? AND undone = 0
    `).get(id) as any;
    if (existing) {
      return reply.status(200).send({
        completion: {
          id: existing.id,
          quest_id: existing.quest_id,
          day: existing.day,
          base_xp: existing.base_xp,
          created_at: existing.created_at
        },
        me: getStats(now)
      });
    }
  }

  // REPARATIE: Folosim Date.now() pentru ID unic la completari
  const compId = `c_${Date.now()}`;
  const base_xp = calculateBaseXp(quest.difficulty, quest.due_date, now.setZone(tz));
  const created_at = now.toUTC().toISO({ suppressMilliseconds: true })!;

  db.prepare(`
    INSERT INTO completions (id, quest_id, day, base_xp, created_at, undone)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(compId, id, day, base_xp, created_at);

  return reply.status(201).send({
    completion: {
      id: compId,
      quest_id: id,
      day,
      base_xp,
      created_at
    },
    me: getStats(now)
  });
});

// GET /completions
app.get('/completions', async (req, reply) => {
  const rows = db.prepare(`
    SELECT id, quest_id, day, base_xp, created_at 
    FROM completions 
    WHERE undone = 0 
    ORDER BY created_at DESC, id DESC
  `).all();
  return reply.status(200).send(rows);
});

// DELETE /completions/:id
app.delete('/completions/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const comp = db.prepare('SELECT * FROM completions WHERE id = ? AND undone = 0').get(id);
  if (!comp) {
    return reply.status(404).send({ error: 'completion not found' });
  }

  db.prepare('UPDATE completions SET undone = 1 WHERE id = ?').run(id);
  return reply.status(204).send();
});

if (require.main === module) {
  app.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening on ${address}`);
  });
}