import { randomBytes } from 'crypto';

const JWT_SECRET_BYTE_LENGTH = 64;

const secret = randomBytes(JWT_SECRET_BYTE_LENGTH).toString('hex');
process.stdout.write(`${secret}\n`);
