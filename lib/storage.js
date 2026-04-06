/**
 * Storage abstraction:
 * - On Vercel (UPSTASH_REDIS_REST_URL env var present): uses @upstash/redis
 * - Locally / fallback: uses drafts.json flat file
 */

const fs = require('fs').promises;
const path = require('path');

const DRAFT_FILE = path.join(process.cwd(), 'drafts.json');
const KV_KEY = 'masters_draft_2026';

function isUpstash() {
  // Vercel Upstash integration injects KV_REST_API_URL / KV_REST_API_TOKEN
  // Direct Upstash setup uses UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
  return !!(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

function getRedis() {
  const { Redis } = require('@upstash/redis');
  return new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function localRead() {
  try {
    const raw = await fs.readFile(DRAFT_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function localWrite(data) {
  await fs.writeFile(DRAFT_FILE, JSON.stringify(data, null, 2));
}

async function getDraft() {
  if (isUpstash()) {
    const redis = getRedis();
    const data = await redis.get(KV_KEY);
    return data || { picks: [] };
  }
  const store = await localRead();
  return store[KV_KEY] || { picks: [] };
}

async function setDraft(draftData) {
  if (isUpstash()) {
    const redis = getRedis();
    await redis.set(KV_KEY, JSON.stringify(draftData));
    return;
  }
  const store = await localRead();
  store[KV_KEY] = draftData;
  await localWrite(store);
}

async function resetDraft() {
  if (isUpstash()) {
    const redis = getRedis();
    await redis.del(KV_KEY);
    return;
  }
  const store = await localRead();
  delete store[KV_KEY];
  await localWrite(store);
}

module.exports = { getDraft, setDraft, resetDraft };
