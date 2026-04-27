/**
 * migrate-teacher-columns.js
 *
 * Adiciona suporte nativo a professores nas tabelas que antes dependiam
 * exclusivamente do perfil de Mentor:
 *
 *   announcements      — adiciona teacher_id (nullable) e torna mentor_id nullable
 *   mentoring_sessions — adiciona teacher_id (nullable)
 *   videos             — remove FK constraint para students, se existir
 *
 * Uso:
 *   node scripts/migrate-teacher-columns.js
 */

import 'dotenv/config';
import sequelize from '../src/db/index.js';

async function main() {
  await sequelize.authenticate();
  console.log('Banco conectado.\n');

  const qi = sequelize.getQueryInterface();

  // ── announcements ────────────────────────────────────────────────────────
  const annCols = await qi.describeTable('announcements');

  if (!annCols.teacher_id) {
    await qi.addColumn('announcements', 'teacher_id', {
      type: 'INTEGER',
      allowNull: true,
      references: { model: 'teachers', key: 'id' },
      onDelete: 'CASCADE',
    });
    console.log('✅  announcements.teacher_id adicionado.');
  } else {
    console.log('ℹ️   announcements.teacher_id já existe.');
  }

  // Torna mentor_id nullable (antes era NOT NULL)
  try {
    await sequelize.query(
      `ALTER TABLE announcements ALTER COLUMN mentor_id DROP NOT NULL`,
    );
    console.log('✅  announcements.mentor_id agora é nullable.');
  } catch {
    console.log('ℹ️   announcements.mentor_id já é nullable (ou coluna não existe).');
  }

  // ── mentoring_sessions ───────────────────────────────────────────────────
  const sesCols = await qi.describeTable('mentoring_sessions');

  if (!sesCols.teacher_id) {
    await qi.addColumn('mentoring_sessions', 'teacher_id', {
      type: 'INTEGER',
      allowNull: true,
      references: { model: 'teachers', key: 'id' },
      onDelete: 'CASCADE',
    });
    console.log('✅  mentoring_sessions.teacher_id adicionado.');
  } else {
    console.log('ℹ️   mentoring_sessions.teacher_id já existe.');
  }

  // ── videos: remove FK para students se existir ───────────────────────────
  try {
    await sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT conname FROM pg_constraint
          WHERE conrelid = 'videos'::regclass AND contype = 'f'
            AND conname ILIKE '%created_by%'
        LOOP
          EXECUTE 'ALTER TABLE videos DROP CONSTRAINT ' || r.conname;
          RAISE NOTICE 'Removido constraint %', r.conname;
        END LOOP;
      END $$;
    `);
    console.log('✅  FK constraint de videos.created_by verificada/removida.');
  } catch (err) {
    console.log('ℹ️   Nenhuma FK constraint em videos.created_by para remover.');
  }

  await sequelize.close();
  console.log('\nMigração concluída com sucesso.');
}

main().catch(err => {
  console.error('Erro na migração:', err.message);
  process.exit(1);
});
