export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  ListItemTab: undefined;
  FavoritesTab: undefined;
  ProfileTab: undefined;
  RentalHistoryTab: undefined;
  ConversationsTab: undefined;
  DisputesTab: undefined;
  BulkEditItems: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ListingDetail: { listingId: string };
  Categories: undefined;
  CategoryDetail: { category: string };
};

export type SearchStackParamList = {
  Search: undefined;
  Filter: undefined;
  ListingDetail: { listingId: string };
};

export type FavoritesStackParamList = {
  Favorites: undefined;
  SavedSearches: undefined;
  ListingDetail: { listingId: string };
};

export type RentalStackParamList = {
  RentalHistory: undefined;
};

export type ConversationsStackParamList = {
  MyConversations: undefined;
};

export type DisputesStackParamList = {
  Disputes: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
};
