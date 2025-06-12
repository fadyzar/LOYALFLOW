import React from 'react';
import { User, Mail, Phone } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { SettingItem } from './SettingItem';
import { useAuth } from '../../../contexts/auth/hooks';  // Updated import

export function ProfileSection() {
  const { user, updateUserProfile } = useAuth();

  return (
    <SettingsSection title="פרופיל" icon={User}>
      <SettingItem
        title="אימייל"
        value={user?.email}
        icon={Mail}
        editable={false}
      />
      <SettingItem
        title="טלפון"
        value={user?.user_metadata?.phone || '---'}
        icon={Phone}
        field="phone"
        editable={true}
        placeholder="הזן מספר טלפון (לדוגמה: 0501234567)"
        onEdit={async (field, value) => {
          await updateUserProfile({ [field]: value });
        }}
      />
    </SettingsSection>
  );
}