import React from 'react';
import { Palette, Bell } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { SettingItem } from './SettingItem';
import { useAuth } from '../../../contexts/auth/hooks';  // Updated import

export function PreferencesSection() {
  const { business, updateBusiness } = useAuth();

  return (
    <SettingsSection title="העדפות" icon={Palette}>
      <SettingItem
        title="התראות"
        value={business?.settings?.notifications ? 'פעיל' : 'כבוי'}
        icon={Bell}
        field="notifications"
        editable={true}
        type="toggle"
        currentValue={business?.settings?.notifications}
        onEdit={async (field, value) => {
          await updateBusiness({
            settings: {
              ...business?.settings,
              [field]: value === 'true'
            }
          });
        }}
      />
      <SettingItem
        title="ערכת נושא"
        value={business?.settings?.theme === 'dark' ? 'כהה' : 'בהיר'}
        icon={Palette}
        field="theme"
        editable={true}
        type="select"
        currentValue={business?.settings?.theme}
        options={[
          { value: 'light', label: 'בהיר' },
          { value: 'dark', label: 'כהה' }
        ]}
        onEdit={async (field, value) => {
          await updateBusiness({
            settings: {
              ...business?.settings,
              [field]: value
            }
          });
        }}
      />
    </SettingsSection>
  );
}