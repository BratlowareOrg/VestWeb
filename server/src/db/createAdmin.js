import 'dotenv/config';
import bcrypt from 'bcrypt';
import sequelize from './index.js';
import Teacher from './models/Teacher.js';

const NAME = 'Admin VestWeb';
const EMAIL = 'admin@vestweb.com';
const ENROLLMENT = 'ADM001';
const PASSWORD = 'VestWeb@Admin123';

async function createAdmin() {
  await sequelize.authenticate();

  const existing = await Teacher.findOne({ where: { enrollment: ENROLLMENT } });
  if (existing) {
    console.log(`\n⚠  Já existe um admin com matrícula ${ENROLLMENT}. Nenhuma alteração feita.\n`);
    await sequelize.close();
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(PASSWORD, 10);

  const admin = await Teacher.create({
    name: NAME,
    email: EMAIL,
    enrollment: ENROLLMENT,
    password_hash,
  });

  console.log('\n✅  Admin criado com sucesso!');
  console.log(`   Nome:      ${admin.name}`);
  console.log(`   Email:     ${admin.email}`);
  console.log(`   Matrícula: ${admin.enrollment}`);
  console.log(`   Senha:     ${PASSWORD}\n`);

  await sequelize.close();
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('❌  Erro ao criar admin:', err.message);
  process.exit(1);
});
