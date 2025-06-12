import React from 'react';

export interface NotificationSettings {
  reminders: {
    enabled: boolean;
    send_before_minutes: number;
    channels: string[];
  };
  confirmations: {
    enabled: boolean;
    require_customer_confirmation: boolean;
    auto_confirm_after_minutes: number;
    channels: string[];
  };
  cancellations: {
    enabled: boolean;
    allow_customer_cancellation: boolean;
    cancellation_deadline_hours: number;
    channels: string[];
  };
  working_hours: {
    start_time: string;
    end_time: string;
    days: number[];
  };
}

export interface NotificationTemplate {
  id: string;
  type: 'appointment_reminder' | 'appointment_confirmation' | 'appointment_cancellation' | 'appointment_rescheduled';
  channel: 'sms' | 'email' | 'whatsapp';
  subject?: string;
  body: string;
  variables: string[];
  is_active: boolean;
}

export interface NotificationLog {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  created_at: string;
  sent_at?: string;
}