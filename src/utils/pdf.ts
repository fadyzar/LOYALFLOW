import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface GeneratePDFOptions {
  business: {
    name: string;
    tax_id?: string;
    business_type?: 'licensed' | 'exempt';
    signature_url?: string;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  invoice: {
    number: string;
    type: string;
    date: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    notes?: string;
    payment_method?: string;
    paid_at?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

export async function generateInvoicePDF(options: GeneratePDFOptions): Promise<Blob> {
  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    floatPrecision: 16
  });

  // Set default font
  doc.setFont('helvetica');

  // Set RTL mode
  (doc as any).setR2L(true);

  // Set margins
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const contentWidth = pageWidth - (margin * 2);

  // Header
  doc.setFontSize(20);
  doc.text(reverseText(options.business.name), pageWidth - margin, margin);

  // Document type and number
  doc.setFontSize(16);
  doc.text(reverseText(getDocumentTypeLabel(options.invoice.type)), pageWidth - margin, margin + 10);
  doc.text(options.invoice.number, pageWidth - margin, margin + 20);

  // Business details
  doc.setFontSize(12);
  if (options.business.tax_id) {
    doc.text(
      reverseText(`${options.business.business_type === 'licensed' ? 'ע.מ/ח.פ' : 'עוסק פטור'}: ${options.business.tax_id}`),
      pageWidth - margin,
      margin + 30
    );
  }

  // Date
  doc.text(
    reverseText(`תאריך: ${format(new Date(options.invoice.date), 'dd/MM/yyyy', { locale: he })}`),
    pageWidth - margin,
    margin + 40
  );

  // Customer details
  doc.setFontSize(14);
  doc.text(reverseText('פרטי לקוח:'), pageWidth - margin, margin + 60);
  doc.setFontSize(12);
  doc.text(reverseText(options.customer.name), pageWidth - margin, margin + 70);
  doc.text(options.customer.phone, pageWidth - margin, margin + 80);
  if (options.customer.email) {
    doc.text(options.customer.email, pageWidth - margin, margin + 90);
  }

  // Items table
  const tableData = options.items.map(item => [
    `₪${item.total.toLocaleString('he-IL')}`,
    `₪${item.unit_price.toLocaleString('he-IL')}`,
    item.quantity.toString(),
    reverseText(item.description)
  ]);

  const tableHeaders = ['סה"כ', 'מחיר', 'כמות', 'תיאור'].map(reverseText);

  (doc as any).autoTable({
    head: [tableHeaders],
    body: tableData,
    startY: margin + 100,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right'
    },
    styles: {
      halign: 'right',
      fontSize: 10
    },
    margin: { right: margin, left: margin }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(
    reverseText(`סה"כ לפני מע"מ: ₪${options.invoice.subtotal.toLocaleString('he-IL')}`),
    pageWidth - margin,
    finalY
  );
  doc.text(
    reverseText(`מע"מ ${options.invoice.tax_rate}%: ₪${options.invoice.tax_amount.toLocaleString('he-IL')}`),
    pageWidth - margin,
    finalY + 10
  );
  doc.setFontSize(14);
  doc.text(
    reverseText(`סה"כ לתשלום: ₪${options.invoice.total.toLocaleString('he-IL')}`),
    pageWidth - margin,
    finalY + 20
  );

  // Payment details
  if (options.invoice.payment_method) {
    doc.setFontSize(12);
    doc.text(
      reverseText(`אמצעי תשלום: ${getPaymentMethodLabel(options.invoice.payment_method)}`),
      pageWidth - margin,
      finalY + 35
    );
    if (options.invoice.paid_at) {
      doc.text(
        reverseText(`שולם בתאריך: ${format(new Date(options.invoice.paid_at), 'dd/MM/yyyy', { locale: he })}`),
        pageWidth - margin,
        finalY + 45
      );
    }
  }

  // Notes
  if (options.invoice.notes) {
    doc.text(reverseText('הערות:'), pageWidth - margin, finalY + 60);
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(reverseText(options.invoice.notes), contentWidth);
    doc.text(splitNotes, pageWidth - margin, finalY + 70);
  }

  // Digital signature
  if (options.business.signature_url) {
    try {
      const response = await fetch(options.business.signature_url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      await new Promise((resolve) => {
        reader.onloadend = () => {
          const img = reader.result as string;
          doc.addImage(img, 'PNG', pageWidth - margin - 50, finalY + 90, 50, 20);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }

  return doc.output('blob');
}

function getDocumentTypeLabel(type: string): string {
  switch (type) {
    case 'invoice':
      return 'חשבונית מס';
    case 'receipt':
      return 'קבלה';
    case 'credit_note':
      return 'חשבונית זיכוי';
    case 'invoice_receipt':
      return 'חשבונית מס/קבלה';
    default:
      return type;
  }
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'מזומן';
    case 'credit_card':
      return 'כרטיס אשראי';
    case 'bank_transfer':
      return 'העברה בנקאית';
    case 'check':
      return "צ'ק";
    case 'bit':
      return 'Bit';
    case 'paybox':
      return 'Paybox';
    default:
      return method;
  }
}

function reverseText(text: string): string {
  return text.split('').reverse().join('');
}