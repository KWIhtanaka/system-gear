export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface Item {
  item_id: number;
  stock?: number;
  display_name?: string;
  model?: string;
  sales_price?: number;
  cost_price?: number;
  moq?: number;
  spq?: number;
  lead_time?: number;
  supplier_stock?: number;
  supplier_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SupplierPart {
  supplier_id: string;
  supplier_maker?: string;
  supplier_part_no: string;
  item_id?: number;
  moq?: number;
  spq?: number;
  lead_time?: number;
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface ImportManagement {
  import_no: number;
  supplier: string;
  file_name?: string;
  file_type?: string;
  total_rows?: number;
  success_rows?: number;
  error_rows?: number;
  status: 'processing' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
}

export interface ErrorLog {
  id: number;
  import_no: number;
  row_no?: number;
  field?: string;
  error_message?: string;
  created_at: Date;
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

export interface ProductSearchParams {
  name?: string;
  model?: string;
  supplier?: string;
  page?: number;
  size?: number;
}

export interface ImportRequest {
  supplier: string;
  file_type: 'stock' | 'price';
}