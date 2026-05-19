import https from 'https';
import fs from 'fs';
import path from 'path';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaHZnaW52dGhnZ3VpZ3lnd3J0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI5MzM2OSwiZXhwIjoyMDkxODY5MzY5fQ.ofkBJ-E84u9z1KqqUV2gXloie0Xqbtr-sxMV9EyjgAk';
const BUCKET = 'question-images';
const OUTPUT_DIR = path.join(process.cwd(), 'question-images');

// Extrai o ref do projeto direto do JWT
const payload = JSON.parse(Buffer.from(SERVICE_ROLE_KEY.split('.')[1], 'base64url').toString());
const SUPABASE_URL = `https://${payload.ref}.supabase.co`;

console.log(`Projeto: ${payload.ref}`);
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Bucket: ${BUCKET}`);
console.log(`Destino: ${OUTPUT_DIR}\n`);

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        ...options.headers,
      },
    };

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function listFiles(prefix = '') {
  const res = await request(
    `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ prefix, limit: 1000, offset: 0 })
  );

  if (res.status !== 200) {
    throw new Error(`Erro ao listar arquivos (${res.status}): ${res.body.toString()}`);
  }

  return JSON.parse(res.body.toString());
}

async function downloadFile(filePath) {
  const res = await request(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`);

  if (res.status !== 200) {
    throw new Error(`Erro ao baixar ${filePath} (${res.status})`);
  }

  return res.body;
}

async function listAllFiles(prefix = '') {
  const items = await listFiles(prefix);
  const files = [];

  for (const item of items) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      // É uma pasta, lista recursivamente
      const subFiles = await listAllFiles(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Listando arquivos...');
  const files = await listAllFiles();

  if (files.length === 0) {
    console.log('Nenhum arquivo encontrado no bucket.');
    return;
  }

  console.log(`${files.length} arquivo(s) encontrado(s).\n`);

  let ok = 0;
  let fail = 0;

  for (const filePath of files) {
    const localPath = path.join(OUTPUT_DIR, filePath);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });

    try {
      const data = await downloadFile(filePath);
      fs.writeFileSync(localPath, data);
      console.log(`✓ ${filePath}`);
      ok++;
    } catch (err) {
      console.error(`✗ ${filePath} — ${err.message}`);
      fail++;
    }
  }

  console.log(`\nConcluído: ${ok} baixados, ${fail} falhas.`);
  console.log(`Imagens salvas em: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
