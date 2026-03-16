export type FinalPaymentRule = 'BEFORE_SHIPMENT' | 'AFTER_SHIPMENT' | 'AFTER_INVOICE' | 'NONE';

export type StageKey =
  | 'PENDING_RAW_MATERIAL'
  | 'PENDING_PREPAYMENT'
  | 'PENDING_PACKAGE_CONFIRM'
  | 'PENDING_CONTACT_APPROVAL'
  | 'PENDING_PRODUCTION'
  | 'IN_PRODUCTION'
  | 'PENDING_SHIPMENT'
  | 'PENDING_FINAL_PAYMENT'
  | 'PENDING_INVOICE'
  | 'COMPLETED';

export type OrderRecord = {
  contract_date: string | null;
  contract_no: string | null;
  customer_name: string | null;
  country: string | null;
  contact_no: string;
  material_no: string | null;
  product_name: string | null;
  spec: string | null;
  batch_no: string | null;
  package_form: string | null;
  quality_standard: string | null;
  unit_price: number | null;
  quantity: number | null;
  contract_amount: number | null;
  export_type: string | null;
  region: string | null;
  internal_contract_no: string | null;
  raw_material_request_date: string | null;
  package_confirm_date: string | null;
  prepayment_received_date: string | null;
  contact_approval_done_date: string | null;
  customer_extra_due_date: string | null;
  computed_due_date: string | null;
  planned_production_date: string | null;
  actual_production_done_date: string | null;
  shipped_date: string | null;
  invoice_done_date: string | null;
  contract_remit_date: string | null;
  final_payment_received_date: string | null;
  need_prepayment: number;
  final_payment_rule: FinalPaymentRule;
  completed_requires_final_payment: number;
  notes: string | null;
  last_follow_up_date: string | null;
  is_key_order: number;
  is_pinned: number;
  custom_tags: string | null;
  stage_override: string | null;
  created_at: string;
  updated_at: string;
};

export type DerivedOrder = OrderRecord & {
  current_stage: StageKey;
  stage_label: string;
  progress_percent: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  is_urgent: boolean;
  is_completed: boolean;
  next_action: string;
  risk_reasons: string[];
  due_date_for_risk: string | null;
  needs_final_payment_attention: boolean;
  needs_invoice_attention: boolean;
  needs_shipment_attention: boolean;
  needs_raw_material_attention: boolean;
};

export type ExportableField = keyof OrderRecord | keyof Pick<DerivedOrder, 'current_stage' | 'stage_label' | 'progress_percent' | 'risk_level' | 'is_urgent' | 'is_completed' | 'next_action'>;
