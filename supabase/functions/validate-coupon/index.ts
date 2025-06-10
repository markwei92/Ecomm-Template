import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CouponData {
  id: string;
  stripe_id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  amount: number;
  valid_from: string;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  created_at: string;
  updated_at: string;
}

interface ValidationResponse {
  valid: boolean;
  discountType?: 'percentage' | 'fixed_amount';
  discountAmount?: number;
  message?: string;
  couponId?: string;
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Verify request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { code, incrementUsage = false } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Please enter a valid promo code' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query the coupons table
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toString().toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Error querying coupons table:', error);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Error validating coupon code' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!coupon) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Invalid promo code' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate coupon rules
    const validationResult = validateCouponRules(coupon);
    
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify(validationResult),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Increment usage if requested
    if (incrementUsage) {
      const { error: updateError } = await supabase
        .from('coupons')
        .update({ 
          times_used: coupon.times_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', coupon.id);

      if (updateError) {
        console.error('Error incrementing coupon usage:', updateError);
        // Don't fail the validation, just log the error
      }
    }

    // Return successful validation
    const response: ValidationResponse = {
      valid: true,
      discountType: coupon.type,
      discountAmount: parseFloat(coupon.amount.toString()),
      message: `Promo code applied: ${coupon.type === 'percentage' ? `${coupon.amount}% off` : `$${coupon.amount} off`}`,
      couponId: coupon.id
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error validating coupon:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: 'An error occurred while validating the promo code' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Validate coupon business rules (expiration, usage limits, etc.)
 */
function validateCouponRules(coupon: CouponData): ValidationResponse {
  const now = new Date();
  
  // Check if coupon is valid from date
  const validFrom = new Date(coupon.valid_from);
  if (now < validFrom) {
    return {
      valid: false,
      message: 'This promo code is not yet active'
    };
  }

  // Check if coupon has expired
  if (coupon.expires_at) {
    const expiresAt = new Date(coupon.expires_at);
    if (now > expiresAt) {
      return {
        valid: false,
        message: 'This promo code has expired'
      };
    }
  }

  // Check usage limits
  if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit) {
    return {
      valid: false,
      message: 'This promo code has reached its usage limit'
    };
  }

  return {
    valid: true
  };
}
