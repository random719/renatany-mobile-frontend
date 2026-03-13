export interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled' | 'completed' | 'inquiry' | 'declined';
  start_date: string;
  end_date: string;
  total_amount: number;
  platform_fee?: number;
  security_deposit?: number;
  total_paid?: number;
  message?: string;
  created_date: string;
  updated_date: string;
}

export interface Dispute {
  id: string;
  rental_request_id: string;
  filed_by_email: string;
  against_email: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  evidence_urls: string[];
  resolution?: string;
  decision?: 'favor_renter' | 'favor_owner' | 'split';
  refund_to_renter?: number;
  charge_to_owner?: number;
  admin_notes?: string;
  created_date: string;
  resolved_date?: string;
}

export interface Message {
  id: string;
  rental_request_id: string;
  sender_email: string;
  content: string;
  attachments: string[];
  message_type: 'text' | 'image' | 'system';
  created_date: string;
  is_read: boolean;
  read_at?: string;
}

export interface AppNotification {
  id: string;
  user_email: string;
  type: 'booking_update' | 'new_message' | 'review' | 'promotion' | 'system' | 'dispute';
  title: string;
  body: string;
  data?: Record<string, string>;
  is_read: boolean;
  created_date: string;
}
