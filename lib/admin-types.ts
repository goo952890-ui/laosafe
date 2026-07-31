export type AdminEvaluationRow = {
  id: number;
  target_type: "phone" | "bank_account";
  target_normalized: string;
  target_display: string;
  evaluation: "spam" | "safe";
  comment: string;
  ip_hash?: string | null;
  encrypted_ip?: string | null;
  user_agent?: string | null;
  device_fingerprint?: string | null;
  created_at: string;
  status: "visible" | "hidden" | "deleted";
};

export type AdminDeletedTargetRow = {
  id: number;
  target_type: "phone" | "bank_account";
  target_normalized: string;
  target_display: string;
  evaluation: "spam" | "safe" | null;
  first_comment: string;
  reported_at: string | null;
  deleted_at: string;
  archived_payload?: {
    evaluations?: Array<{
      id?: number;
      target_type?: "phone" | "bank_account";
      target_normalized?: string;
      target_display?: string;
      evaluation?: "spam" | "safe";
      comment?: string;
      ip_hash?: string | null;
      encrypted_ip?: string | null;
      user_agent?: string | null;
      device_fingerprint?: string | null;
      created_at?: string;
      updated_at?: string;
      status?: "visible" | "hidden" | "deleted";
    }>;
    votes?: Array<{
      id?: number;
      vote?: "spam" | "safe";
      ip_hash?: string | null;
      encrypted_ip?: string | null;
      created_at?: string;
      updated_at?: string;
      target_normalized?: string;
      target_display?: string;
    }>;
    deletionRequests?: Array<{
      id?: number;
      reason?: string;
      description?: string;
      contact?: string;
      status?: "submitted" | "reviewing" | "resolved" | "rejected";
      created_at?: string;
      updated_at?: string;
    }>;
    phoneRow?: Record<string, unknown> | null;
    accountRow?: Record<string, unknown> | null;
    qrRows?: Array<Record<string, unknown>>;
  };
};

export type AdminDeletionRequestRow = {
  id: number;
  target_type: "phone" | "bank_account";
  target_label: string;
  reason: string;
  description: string;
  contact: string;
  status: "submitted" | "reviewing" | "resolved" | "rejected";
  created_at: string;
  target_hidden?: boolean;
};

export type AdminSecurityLogRow = {
  id: number;
  log_type: "input_validation_failed" | "abnormal_ip_blocked";
  source: "evaluation" | "deletion_request" | "lookup_rate_limit" | "contact_inquiry";
  target_type?: "phone" | "bank_account" | null;
  target_value?: string | null;
  ip?: string | null;
  identity_key?: string | null;
  detail?: string | null;
  created_at: string;
};

export type AdminInquiryRow = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export type AdminTargetViewStats = {
  totalViews: number;
  lastViewedAt: string | null;
};
