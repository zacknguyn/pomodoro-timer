import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

export class AuthService {
  async register(email, password) {
    const existing = userRepository.findByEmail(email);
    if (existing) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository.create({ email, password: hashedPassword });

    return this.generateToken(user);
  }

  async login(email, password) {
    const user = userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    return this.generateToken(user);
  }

  generateToken(user) {
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    return { token, user: { id: user.id, email: user.email } };
  }
}

export default new AuthService();
