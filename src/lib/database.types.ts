export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Lang = 'en' | 'hi' | 'mr';

export type SessionStatus =
  | 'initiated'
  | 'handed_off'
  | 'claimed'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type SmsKind = 'claim' | 'confirm' | 'void' | 'otp';
export type SmsProvider = 'fast2sms' | 'twilio' | 'mock';
export type SmsDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'unknown';

export interface Database {
  public: {
    Tables: {
      drivers: {
        Row: {
          id: string;
          slug: string;
          first_name: string;
          vehicle: string;
          driver_phone: string;
          proxy_phone: string;
          proxy_email: string | null;
          vpa: string;
          lang: Lang;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          first_name: string;
          vehicle: string;
          driver_phone: string;
          proxy_phone: string;
          proxy_email?: string | null;
          vpa: string;
          lang?: Lang;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          first_name?: string;
          vehicle?: string;
          driver_phone?: string;
          proxy_phone?: string;
          proxy_email?: string | null;
          vpa?: string;
          lang?: Lang;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      qr_endpoints: {
        Row: {
          id: string;
          driver_id: string;
          slug: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          slug: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          slug?: string;
          active?: boolean;
          created_at?: string;
        };
      };
      otp_challenges: {
        Row: {
          id: string;
          phone: string;
          code_hash: string;
          expires_at: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          code_hash: string;
          expires_at: string;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          code_hash?: string;
          expires_at?: string;
          verified?: boolean;
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          driver_id: string;
          slug: string;
          token: string;
          seq: number;
          amount: number;
          credited_amount: number | null;
          sender_name: string;
          status: SessionStatus;
          created_at: string;
          claimed_at: string | null;
          resolved_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          slug: string;
          token: string;
          seq?: number;
          amount: number;
          credited_amount?: number | null;
          sender_name?: string;
          status?: SessionStatus;
          created_at?: string;
          claimed_at?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          slug?: string;
          token?: string;
          seq?: number;
          amount?: number;
          credited_amount?: number | null;
          sender_name?: string;
          status?: SessionStatus;
          created_at?: string;
          claimed_at?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
      };
      sms_logs: {
        Row: {
          id: string;
          session_id: string | null;
          to_phone: string;
          kind: SmsKind;
          provider: SmsProvider;
          delivery: SmsDeliveryStatus;
          message_id: string | null;
          payload: Json | null;
          created_at: string;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          to_phone: string;
          kind: SmsKind;
          provider?: SmsProvider;
          delivery?: SmsDeliveryStatus;
          message_id?: string | null;
          payload?: Json | null;
          created_at?: string;
          delivered_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          to_phone?: string;
          kind?: SmsKind;
          provider?: SmsProvider;
          delivery?: SmsDeliveryStatus;
          message_id?: string | null;
          payload?: Json | null;
          created_at?: string;
          delivered_at?: string | null;
        };
      };
    };
  };
}
