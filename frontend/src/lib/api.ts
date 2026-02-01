const API_BASE = '/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'An error occurred');
  }

  return response.json();
}

// Types
export interface TaxProjection {
  gross_income: number;
  federal_tax: number;
  california_tax: number;
  oklahoma_tax: number;
  fica_tax: number;
  total_tax: number;
  effective_rate: number;
  withheld_ytd: number;
  projected_liability: number;
  refund_or_owed: number;
}

export interface Paystub {
  id: string;
  pay_date: string | null;
  gross_pay: number;
  federal_withheld: number;
  state_withheld: number;
  fica_withheld: number;
  net_pay: number;
  _401k_contribution: number;
  rsu_income?: number;
}

export interface RSUPosition {
  symbol: string;
  quantity: number;
  cost_basis: number;
  current_price: number;
  current_value: number;
  unrealized_gain: number;
  vesting_date: string;
}

export interface RSUVestingEvent {
  id: string;
  grant_id: string;
  symbol: string;
  grant_date: string;
  vesting_date: string;
  shares_vesting: number;
  fmv_at_vest: number;
  total_value: number;
}

export interface RSUVestingEventCreate {
  grant_id: string;
  symbol: string;
  grant_date: string;
  vesting_date: string;
  shares_vesting: number;
  fmv_at_vest: number;
}

export interface RSUVestingScheduleSummary {
  total_grants: number;
  total_shares_granted: number;
  total_shares_vested: number;
  total_shares_pending: number;
  upcoming_vests: RSUVestingEvent[];
  past_vests: RSUVestingEvent[];
}

export interface QuarterlyEstimate {
  quarter: number;
  due_date: string;
  federal_amount: number;
  california_amount: number;
  oklahoma_amount: number;
  total_amount: number;
  paid: boolean;
  paid_amount?: number;
}

export interface Optimizer401kResult {
  current_contribution_percent: number;
  recommended_percent: number;
  remaining_contribution_room: number;
  max_contribution: number;
  projected_year_end_contribution: number;
  tax_savings: number;
}

// API Functions
export const api = {
  // Tax projection
  getProjection: (year?: number) =>
    fetchAPI<TaxProjection>(`/tax/projection${year ? `?year=${year}` : ''}`),

  // Paystubs
  getPaystubs: () => fetchAPI<Paystub[]>('/paystubs'),

  uploadPaystub: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/paystubs/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail);
    }
    return response.json() as Promise<Paystub>;
  },

  // E*Trade / RSU
  getEtradeAuthUrl: () => fetchAPI<{ auth_url: string }>('/etrade/auth-url'),

  etradeCallback: (code: string, verifier: string) =>
    fetchAPI<{ success: boolean }>('/etrade/callback', {
      method: 'POST',
      body: JSON.stringify({ code, verifier }),
    }),

  getRSUPositions: () => fetchAPI<RSUPosition[]>('/etrade/positions'),

  // 401k Optimizer
  get401kOptimization: (params: {
    current_contribution_percent: number;
    annual_salary: number;
    ytd_contribution: number;
    remaining_pay_periods: number;
    age?: number;
  }) =>
    fetchAPI<Optimizer401kResult>('/optimizer/401k', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Quarterly estimates
  getQuarterlyEstimates: (year?: number) =>
    fetchAPI<QuarterlyEstimate[]>(`/quarterly/estimate${year ? `?year=${year}` : ''}`),

  markQuarterlyPaid: (quarter: number, amount: number) =>
    fetchAPI<QuarterlyEstimate>('/quarterly/mark-paid', {
      method: 'POST',
      body: JSON.stringify({ quarter, amount }),
    }),

  // Notifications
  testNotification: (email: string) =>
    fetchAPI<{ success: boolean }>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // RSU Vesting Schedule
  uploadRSUCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/rsu-vesting/upload-csv`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }
    return response.json() as Promise<RSUVestingEvent[]>;
  },

  getRSUVestingEvents: () => fetchAPI<RSUVestingEvent[]>('/rsu-vesting'),

  getRSUVestingSummary: () => fetchAPI<RSUVestingScheduleSummary>('/rsu-vesting/summary'),

  createRSUVestingEvent: (event: RSUVestingEventCreate) =>
    fetchAPI<RSUVestingEvent>('/rsu-vesting', {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  updateRSUVestingEvent: (eventId: string, event: RSUVestingEventCreate) =>
    fetchAPI<RSUVestingEvent>(`/rsu-vesting/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    }),

  deleteRSUVestingEvent: (eventId: string) =>
    fetchAPI<{ success: boolean }>(`/rsu-vesting/${eventId}`, {
      method: 'DELETE',
    }),

  getRSUVestingEventsByGrant: (grantId: string) =>
    fetchAPI<RSUVestingEvent[]>(`/rsu-vesting/grant/${grantId}`),
};
