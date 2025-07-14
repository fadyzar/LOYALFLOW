import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase
     // ודא שיש לך קובץ כזה שמייצא client

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { customers } = req.body;

  if (!Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'No customers provided' });
  }

  try {
    // שמירה מרוכזת של כל הלקוחות (bulk insert)
    const { data, error } = await supabase
      .from('customers')
      .insert(customers)
      .select();

    if (error) {
      console.error('Supabase Import Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // החזר את הלקוחות שנשמרו
    res.status(200).json(data);
  } catch (error) {
    console.error('DB Import Error:', error);
    res.status(500).json({ error: 'Failed to import customers' });
  }
}
