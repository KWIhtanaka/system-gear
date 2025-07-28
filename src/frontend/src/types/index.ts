export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export interface Product {
  item_id: number;
  model: string;
  name: string;
  stock?: number;
  price?: number;
  supplier?: string;
  supplier_stock?: number;
  moq?: number;
  spq?: number;
  lead_time?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductSearchParams {
  name?: string;
  model?: string;
  supplier?: string;
  page?: number;
  size?: number;
}

export interface MappingRule {
  id: number;
  supplier: string;
  file_field: string;
  db_field: string;
  type?: string;
  condition?: string;
  fixed_value?: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ImportHistory {
  import_no: number;
  supplier: string;
  file_name?: string;
  file_type?: string;
  total_rows?: number;
  success_rows?: number;
  error_rows?: number;
  status: 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'uploaded';
  created_at: string;
  completed_at?: string;
}

export interface ImportError {
  id: number;
  import_no: number;
  row_no?: number;
  field?: string;
  error_message?: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  total: number;
  page: number;
  size: number;
}

export interface ImportStatistics {
  total_imports: number;
  completed_imports: number;
  completed_with_errors: number;
  failed_imports: number;
  processing_imports: number;
  total_rows_processed: number;
  total_success_rows: number;
  total_error_rows: number;
  supplier?: string;
}