export interface ImportRecord {
  import_no: number;
  supplier_id: string;
  supplier_maker?: string;
  supplier_part_no: string;
  [key: string]: any;
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
}

export interface BatchJobResult {
  success: boolean;
  processed_count: number;
  error_count: number;
  errors: BatchError[];
  duration_ms: number;
}

export interface BatchError {
  row_no?: number;
  field?: string;
  error_message: string;
  raw_data?: any;
}

export interface FileProcessingResult {
  success: boolean;
  total_rows: number;
  processed_rows: number;
  error_rows: number;
  errors: BatchError[];
  import_no?: number;
}

export interface SupplierData {
  supplier_id: string;
  supplier_maker?: string;
  supplier_part_no: string;
  moq?: number;
  spq?: number;
  stock?: number;
  price?: number;
  currency?: string;
  quantity?: number;
  [key: string]: any;
}