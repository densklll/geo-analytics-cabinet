export type Role = 'admin' | 'client';

export interface Profile {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  company: { id: number; name: string } | null;
}

export interface Period {
  from: string;
  to: string;
  days: number;
}

export interface Totals {
  views: number;
  websiteClicks: number;
  calls: number;
  routes: number;
  avgRating: number | null;
  reviewsCount: number;
}

export interface Summary {
  period: Period;
  current: Totals;
  previous: Totals & { period: Period };
}

export type MetricName = 'views' | 'website_clicks' | 'calls' | 'routes';

export interface Timeseries {
  metric: MetricName;
  points: { date: string; value: number }[];
}

export interface Company {
  id: number;
  name: string;
  branchesCount: number;
}

export interface BranchStats extends Totals {
  id: number;
  name: string;
  city: string;
  address: string;
  companyId: number;
  companyName: string;
}

export interface BranchesResponse {
  period: Period;
  items: BranchStats[];
  total: Totals;
}

export type ReviewStatus = 'new' | 'in_progress' | 'resolved';

export interface Review {
  id: number;
  source: 'yandex' | '2gis' | 'google';
  authorName: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  publishedAt: string;
  branchId: number;
  branchName: string;
}

export interface ReviewsResponse {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  byStatus: Record<ReviewStatus, number>;
}
