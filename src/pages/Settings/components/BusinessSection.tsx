import React from 'react';
import { Building, Globe } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { SettingItem } from './SettingItem';
import { useAuth } from '../../../contexts/auth/hooks';  // Updated import
import toast from 'react-hot-toast';

export function BusinessSection() {
  const { user, business, updateBusiness } = useAuth();

  const getBookingLink = () => {
    if (!business?.booking_link) return '---';
    return `${window.location.origin}/book/${business.booking_link}`;
  };

  const handleCopyLink = (link: string | undefined) => {
    if (!link) {
      toast.error('אין קישור להעתקה');
      return;
    }
    navigator.clipboard.writeText(link);
    toast.success('הקישור הועתק ללוח');
  };

  const handleOpenLink = (link: string | undefined) => {
    if (!link) {
      toast.error('אין קישור לפתיחה');
      return;
    }
    window.open(link, '_blank');
  };

  return (
    <SettingsSection title="העסק שלי" icon={Building}>
      <SettingItem
        title="שם העסק"
        value={business?.name || user?.user_metadata?.business_name}
        icon={Building}
        field="name"
        editable={true}
        placeholder="הזן את שם העסק"
        onEdit={async (field, value) => {
          await updateBusiness({ [field]: value });
        }}
      />
      <SettingItem
        title="קישור ליומן"
        value={getBookingLink()}
        icon={Globe}
        editable={false}
        copyable={true}
        openInNew={true}
        onCopy={handleCopyLink}
        onOpen={handleOpenLink}
      />
    </SettingsSection>
  );
}