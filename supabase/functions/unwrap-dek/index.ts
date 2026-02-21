// Supabase Edge Function: unwrap-dek
// Retrieves the encrypted DEK for a post from the DB,
// decrypts it with the KEK, and returns the raw DEK to the client.

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
        const { post_id } = await req.json();

        if (!post_id) {
            return new Response(JSON.stringify({ error: 'post_id is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Load KEK from environment variable
        const kekHex = Deno.env.get('MASTER_KEY_HEX');
        if (!kekHex || kekHex.length !== 64) {
            throw new Error('MASTER_KEY_HEX is not set or invalid');
        }

        const kekBytes = new Uint8Array(kekHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

        // Fetch encrypted DEK from DB using service role
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data, error } = await supabase
            .from('post_keys')
            .select('encrypted_dek, iv')
            .eq('post_id', post_id)
            .single();

        if (error || !data) {
            return new Response(JSON.stringify({ error: 'Key not found for this post' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Decode Base64 values from DB
        const encryptedDekBytes = Uint8Array.from(atob(data.encrypted_dek), (c) => c.charCodeAt(0));
        const ivBytes = Uint8Array.from(atob(data.iv), (c) => c.charCodeAt(0));

        // Import KEK as AES-GCM decryption key
        const kek = await crypto.subtle.importKey(
            'raw',
            kekBytes,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // Decrypt (unwrap) the DEK
        const dekBytes = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes },
            kek,
            encryptedDekBytes
        );

        // Return the raw DEK as Base64 to the client
        const dekBase64 = btoa(String.fromCharCode(...new Uint8Array(dekBytes)));

        return new Response(JSON.stringify({ dek_base64: dekBase64 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
