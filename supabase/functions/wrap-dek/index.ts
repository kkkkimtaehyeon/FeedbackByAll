// Supabase Edge Function: wrap-dek
// Receives a Base64-encoded DEK from the client, wraps it with the KEK,
// then stores the encrypted DEK and IV in the post_keys table.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { dek_base64, post_id } = await req.json();

        if (!dek_base64 || !post_id) {
            return new Response(JSON.stringify({ error: 'dek_base64 and post_id are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Load KEK from environment variable (64-char hex = 32 bytes)
        const kekHex = Deno.env.get('MASTER_KEY_HEX');
        if (!kekHex || kekHex.length !== 64) {
            throw new Error('MASTER_KEY_HEX is not set or invalid');
        }

        // Convert KEK hex string to Uint8Array
        const kekBytes = new Uint8Array(kekHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

        // Import KEK as AES-GCM key for wrapping
        const kek = await crypto.subtle.importKey(
            'raw',
            kekBytes,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        // Decode the DEK sent from the client
        const dekBytes = Uint8Array.from(atob(dek_base64), (c) => c.charCodeAt(0));

        // Generate a random IV for wrapping
        const wrapIv = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt (wrap) the DEK with KEK
        const encryptedDek = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: wrapIv },
            kek,
            dekBytes
        );

        // Encode to Base64 for storage
        const encryptedDekBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedDek)));
        const ivBase64 = btoa(String.fromCharCode(...wrapIv));

        // Save to post_keys table using service role (bypasses RLS)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { error } = await supabase.from('post_keys').insert({
            post_id,
            encrypted_dek: encryptedDekBase64,
            iv: ivBase64,
        });

        if (error) {
            throw new Error(`DB insert error: ${error.message}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
