import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../db/database.service';
import { AuthUser, Role } from './auth-user';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  company_id: number | null;
  company_name: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.findByEmail(email.trim().toLowerCase());
    // одна и та же ошибка для "нет пользователя" и "не тот пароль"
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    });
    return { token, user: this.toProfile(user) };
  }

  async profile(authUser: AuthUser) {
    const user = await this.findByEmail(authUser.email);
    if (!user) throw new NotFoundException('Пользователь не найден');
    return this.toProfile(user);
  }

  private findByEmail(email: string) {
    return this.db.one<UserRow>(
      `SELECT u.*, c.name AS company_name
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.email = $1`,
      [email],
    );
  }

  private toProfile(user: UserRow) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      company: user.company_id ? { id: user.company_id, name: user.company_name } : null,
    };
  }
}
