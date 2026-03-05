export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  rating: number;
  totalReviews: number;
  memberSince: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  location: { city: string; state: string; country: string };
  paymentSetup: {
    cardConnected: boolean;
    bankConnected: boolean;
  };
  stats: {
    totalItems: number;
    availableItems: number;
  };
}
