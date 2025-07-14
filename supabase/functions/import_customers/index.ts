// @ts-nocheck
// supabase/functions/import_customers/index.ts

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-client-info, apikey, Authorization',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // טיפול ב-OPTIONS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let rawBody = await req.text();
    rawBody = rawBody?.trim();
    console.log('📦 rawBody:', rawBody);

    if (!rawBody) {
      return new Response(JSON.stringify({ error: 'Missing request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (jsonErr) {
      console.error('❌ JSON.parse failed:', jsonErr.message);
      return new Response(JSON.stringify({
        error: 'Invalid JSON',
        details: jsonErr.message,
        rawBody
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ parsedBody:', parsedBody);

    const customers = Array.isArray(parsedBody?.customers) ? parsedBody.customers : null;

    if (!customers) {
      console.error("❌ 'customers' is missing or not an array");
      return new Response(JSON.stringify({
        error: "Missing or invalid 'customers' field",
        received: parsedBody
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabaseClient.from('customers').insert(customers);

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Inserted customers:', customers.length);

    return new Response(JSON.stringify({ success: true, inserted: customers.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Uncaught error:', err);
    return new Response(JSON.stringify({
      error: 'Server error',
      details: err?.message || String(err),
      stack: err?.stack || null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
