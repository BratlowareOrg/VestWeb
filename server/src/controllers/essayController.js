import fetch from 'node-fetch';
import formidable from 'formidable';
import { readFileSync } from 'fs';
import { getRequestLogger } from '../services/logger.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024, filter: ({ mimetype }) => mimetype === 'application/pdf' });
    form.parse(req, (err, _fields, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });

export const correctEssay = async (req, res) => {
  let files;
  try {
    files = await parseForm(req);
  } catch (err) {
    return res.status(400).json({ message: 'Erro ao processar o arquivo enviado.' });
  }

  const uploaded = files.pdf;
  const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  if (!file) {
    return res.status(400).json({ message: 'Nenhum arquivo PDF enviado.' });
  }

  let pdfBase64;
  try {
    pdfBase64 = readFileSync(file.filepath).toString('base64');
  } catch {
    return res.status(422).json({ message: 'Não foi possível ler o arquivo.' });
  }

  const prompt = `Você é um corretor especializado em redações do ENEM. Analise a redação no PDF anexado e forneça uma correção detalhada nas 5 competências do ENEM.

Para cada competência, atribua uma nota de 0 a 200 (apenas múltiplos de 40: 0, 40, 80, 120, 160 ou 200) e forneça um comentário detalhado em português.

Responda APENAS com JSON válido, sem texto antes ou depois, no seguinte formato:
{
  "nota_total": <soma das 5 notas>,
  "competencias": [
    { "numero": 1, "nome": "Domínio da norma padrão da língua escrita", "nota": <0-200>, "comentario": "..." },
    { "numero": 2, "nome": "Compreensão da proposta e desenvolvimento do tema", "nota": <0-200>, "comentario": "..." },
    { "numero": 3, "nome": "Seleção e organização das informações e argumentos", "nota": <0-200>, "comentario": "..." },
    { "numero": 4, "nome": "Conhecimento dos mecanismos linguísticos de argumentação", "nota": <0-200>, "comentario": "..." },
    { "numero": 5, "nome": "Proposta de intervenção", "nota": <0-200>, "comentario": "..." }
  ],
  "comentario_geral": "...",
  "pontos_positivos": ["...", "..."],
  "pontos_melhorar": ["...", "..."]
}`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      getRequestLogger(req).error({ event: 'essay_anthropic_api_error', statusCode: response.status, details: errBody }, 'Anthropic API error');
      return res.status(502).json({ message: 'Erro ao consultar a IA. Verifique a chave ANTHROPIC_API_KEY.' });
    }

    const aiData = await response.json();
    const raw = aiData.content?.[0]?.text ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta da IA fora do formato esperado.');

    const correction = JSON.parse(jsonMatch[0]);
    return res.json({ correction });
  } catch (err) {
    getRequestLogger(req).error({ err, event: 'essay_correction_error' }, 'Erro na correção IA');
    return res.status(500).json({ message: 'Erro ao processar correção com IA.' });
  }
};
