import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'borsch-super-secret-key-2026';

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const login = async (username: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error('Invalid credentials');
  }

  const token = await sign(
    { 
      id: user.id, 
      role: user.role, 
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 
    }, 
    JWT_SECRET
  );

  return {
    token,
    user: {
      username: user.username,
      role: user.role
    }
  };
};
