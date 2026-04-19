export interface DonationCampaign {
  id?: string;
  title?: string;
  description?: string;
  goalAmount?: number;
  currentAmount?: number;
  imageUrl?: string;
  active?: boolean;
  createdAt?: string;
}

export interface Donation {
  id?: string;
  amount?: number;
  donorFirstName?: string;
  donorLastName?: string;
  donorEmail?: string;
  donorPhone?: string;
  paymentMethod?: string;
  anonymous?: boolean;
  message?: string;
  campaignId?: string;
  userId?: number;
  stripeSessionId?: string;
  status?: string;
  createdAt?: string;
}
