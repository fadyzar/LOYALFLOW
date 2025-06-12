export interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  sections: {
    header: {
      logo?: boolean;
      businessName?: boolean;
      socialLinks?: boolean;
    };
    hero: {
      image?: boolean;
      title?: string;
      subtitle?: string;
      bookingButton?: boolean;
    };
    services: {
      layout: 'grid' | 'list';
      showPrices?: boolean;
      showDuration?: boolean;
    };
    staff: {
      layout: 'grid' | 'list';
      showSpecialties?: boolean;
      showDescription?: boolean;
    };
    gallery?: {
      layout: 'grid' | 'masonry';
      columns: number;
    };
    contact: {
      showForm?: boolean;
      showMap?: boolean;
      showInfo?: boolean;
    };
    footer: {
      showSocial?: boolean;
      showContact?: boolean;
      showHours?: boolean;
    };
  };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

export const templates: Template[] = [
  {
    id: 'modern',
    name: 'מודרני ונקי',
    description: 'עיצוב מינימליסטי עם דגש על תמונות ומרווח נשימה',
    preview: '/templates/modern.jpg',
    sections: {
      header: {
        logo: true,
        businessName: true,
        socialLinks: false
      },
      hero: {
        image: true,
        title: 'ברוכים הבאים',
        subtitle: 'הזמינו תור עוד היום',
        bookingButton: true
      },
      services: {
        layout: 'grid',
        showPrices: true,
        showDuration: true
      },
      staff: {
        layout: 'grid',
        showSpecialties: true,
        showDescription: true
      },
      gallery: {
        layout: 'grid',
        columns: 3
      },
      contact: {
        showForm: true,
        showMap: true,
        showInfo: true
      },
      footer: {
        showSocial: true,
        showContact: true,
        showHours: true
      }
    },
    colors: {
      primary: '#4F46E5',
      secondary: '#6366F1',
      background: '#FFFFFF',
      text: '#1F2937'
    }
  },
  {
    id: 'boutique',
    name: 'בוטיק ויוקרתי',
    description: 'עיצוב אלגנטי המשדר יוקרה ואיכות',
    preview: '/templates/boutique.jpg',
    sections: {
      header: {
        logo: true,
        businessName: true,
        socialLinks: true
      },
      hero: {
        image: true,
        title: 'חוויה יוקרתית',
        subtitle: 'הרגע המושלם לפנק את עצמך',
        bookingButton: true
      },
      services: {
        layout: 'list',
        showPrices: true,
        showDuration: true
      },
      staff: {
        layout: 'list',
        showSpecialties: true,
        showDescription: true
      },
      gallery: {
        layout: 'masonry',
        columns: 2
      },
      contact: {
        showForm: true,
        showMap: false,
        showInfo: true
      },
      footer: {
        showSocial: true,
        showContact: true,
        showHours: true
      }
    },
    colors: {
      primary: '#9333EA',
      secondary: '#A855F7',
      background: '#FFFFFF',
      text: '#1F2937'
    }
  },
  {
    id: 'urban',
    name: 'אורבני וצעיר',
    description: 'עיצוב דינמי ועכשווי לקהל צעיר',
    preview: '/templates/urban.jpg',
    sections: {
      header: {
        logo: true,
        businessName: true,
        socialLinks: true
      },
      hero: {
        image: true,
        title: 'הסטייל שלך',
        subtitle: 'מתחדשים בסטייל',
        bookingButton: true
      },
      services: {
        layout: 'grid',
        showPrices: true,
        showDuration: false
      },
      staff: {
        layout: 'grid',
        showSpecialties: true,
        showDescription: false
      },
      gallery: {
        layout: 'masonry',
        columns: 3
      },
      contact: {
        showForm: true,
        showMap: true,
        showInfo: true
      },
      footer: {
        showSocial: true,
        showContact: true,
        showHours: true
      }
    },
    colors: {
      primary: '#EC4899',
      secondary: '#F472B6',
      background: '#FFFFFF', 
      text: '#1F2937'
    }
  }
];