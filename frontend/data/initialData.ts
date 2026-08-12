import { Tool, User, ToolStatus } from '../types';

export const INITIAL_TOOLS: Tool[] = [
  { id: '1', name: 'Chave de Fenda', category: 'Manual', size: '1/4"', sector: 'Manutenção A', status: ToolStatus.AVAILABLE },
  { id: '2', name: 'Chave Phillips', category: 'Manual', size: '3/8"', sector: 'Manutenção A', status: ToolStatus.AVAILABLE },
  { id: '3', name: 'Alicate Universal', category: 'Manual', size: '8"', sector: 'Montagem', status: ToolStatus.UNAVAILABLE },
  { id: '4', name: 'Furadeira de Impacto', category: 'Elétrica', sector: 'Usinagem', status: ToolStatus.AVAILABLE },
  { id: '5', name: 'Paquímetro Digital', category: 'Medição', size: '150mm', sector: 'Controle de Qualidade', status: ToolStatus.AVAILABLE },
  { id: '6', name: 'Martelete', category: 'Elétrica', sector: 'Civil', status: ToolStatus.AVAILABLE },
  { id: '7', name: 'Jogo de Chaves Allen', category: 'Manual', sector: 'Manutenção B', status: ToolStatus.AVAILABLE },
  { id: '8', name: 'Multímetro', category: 'Elétrica', sector: 'Elétrica', status: ToolStatus.UNAVAILABLE },
];

export const INITIAL_USERS: User[] = [
  { id: '1', name: 'Gerente', matricula: '459524', active: true, role: 'admin' },
];