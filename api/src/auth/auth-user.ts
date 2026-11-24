export type Role = 'admin' | 'client';

/** То, что лежит в JWT и доступно в каждом запросе как request.user */
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  companyId: number | null;
}
