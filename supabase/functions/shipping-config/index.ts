import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// Default shipping configuration
const DEFAULT_CONFIG = {
  base_shipping_cost: 400, // $4.00 in cents
  additional_item_cost: 100, // $1.00 in cents
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Check if we're getting or updating the configuration
    if (req.method === 'GET') {
      // Try to get the shipping configuration from the database
      const { data, error } = await supabase
        .from('shipping_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shipping config:', error);
        
        // If the table doesn't exist, create it with default values
        if (error.code === 'PGRST116' || error.message.includes('relation "shipping_config" does not exist')) {
          try {
            // Create the table
            await supabase.rpc('create_shipping_config_table');
            
            // Insert default values
            const { data: insertData, error: insertError } = await supabase
              .from('shipping_config')
              .insert([DEFAULT_CONFIG])
              .select();
              
            if (insertError) {
              console.error('Error inserting default shipping config:', insertError);
              return corsResponse({ ...DEFAULT_CONFIG, source: 'default' });
            }
            
            return corsResponse({ ...insertData[0], source: 'new_table' });
          } catch (createError) {
            console.error('Error creating shipping config table:', createError);
            return corsResponse({ ...DEFAULT_CONFIG, source: 'default' });
          }
        }
        
        return corsResponse({ ...DEFAULT_CONFIG, source: 'default' });
      }

      // If no data found, return default values
      if (!data) {
        // Insert default values
        const { data: insertData, error: insertError } = await supabase
          .from('shipping_config')
          .insert([DEFAULT_CONFIG])
          .select();
          
        if (insertError) {
          console.error('Error inserting default shipping config:', insertError);
          return corsResponse({ ...DEFAULT_CONFIG, source: 'default' });
        }
        
        return corsResponse({ ...insertData[0], source: 'inserted' });
      }

      return corsResponse({ ...data, source: 'database' });
    } else if (req.method === 'POST') {
      // Update the shipping configuration
      const requestData = await req.json();
      
      // Validate the input
      const baseShippingCost = parseInt(requestData.base_shipping_cost);
      const additionalItemCost = parseInt(requestData.additional_item_cost);
      
      if (isNaN(baseShippingCost) || isNaN(additionalItemCost)) {
        return corsResponse({ error: 'Invalid shipping cost values' }, 400);
      }
      
      // Try to update the shipping configuration
      const { data, error } = await supabase
        .from('shipping_config')
        .insert([{
          base_shipping_cost: baseShippingCost,
          additional_item_cost: additionalItemCost,
          updated_at: new Date().toISOString()
        }])
        .select();
        
      if (error) {
        console.error('Error updating shipping config:', error);
        
        // If the table doesn't exist, create it
        if (error.code === 'PGRST116' || error.message.includes('relation "shipping_config" does not exist')) {
          try {
            // Create the table
            await supabase.rpc('create_shipping_config_table');
            
            // Try again
            const { data: insertData, error: insertError } = await supabase
              .from('shipping_config')
              .insert([{
                base_shipping_cost: baseShippingCost,
                additional_item_cost: additionalItemCost,
                updated_at: new Date().toISOString()
              }])
              .select();
              
            if (insertError) {
              console.error('Error inserting shipping config after table creation:', insertError);
              return corsResponse({ error: 'Failed to update shipping configuration' }, 500);
            }
            
            return corsResponse({ success: true, data: insertData[0] });
          } catch (createError) {
            console.error('Error creating shipping config table:', createError);
            return corsResponse({ error: 'Failed to create shipping configuration table' }, 500);
          }
        }
        
        return corsResponse({ error: 'Failed to update shipping configuration' }, 500);
      }

      return corsResponse({ success: true, data: data[0] });
    } else {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }
  } catch (error) {
    console.error('Error handling shipping config request:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
