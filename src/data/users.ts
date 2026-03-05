import { User } from '../types/user';

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'tejasimma033',
    name: 'Teja',
    email: 'teja@example.com',
    phone: '+33 6 12 34 56 78',
    avatar: '',
    bio: 'Renting and sharing in Paris',
    rating: 4.8,
    totalReviews: 12,
    memberSince: '2025-01-15',
    isVerified: true,
    role: 'user',
    location: { city: 'Paris', state: 'Ile-de-France', country: 'France' },
    paymentSetup: { cardConnected: false, bankConnected: false },
    stats: { totalItems: 0, availableItems: 0 },
  },
  {
    id: '2',
    username: 'collegeworks0910',
    name: 'Admin User',
    email: 'admin@rentany.fr',
    phone: '+33 6 98 76 54 32',
    avatar: '',
    bio: 'RentAny platform admin',
    rating: 5.0,
    totalReviews: 0,
    memberSince: '2024-06-01',
    isVerified: true,
    role: 'admin',
    location: { city: 'Paris', state: 'Ile-de-France', country: 'France' },
    paymentSetup: { cardConnected: true, bankConnected: true },
    stats: { totalItems: 5, availableItems: 3 },
  },
];

export const currentUser = mockUsers[0];
