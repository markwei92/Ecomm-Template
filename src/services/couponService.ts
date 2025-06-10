import { supabase } from '../lib/supabase';

export interface CouponData {
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

export interface PromoCodeValidationResponse {
  valid: boolean;
  discountType?: 'percentage' | 'fixed_amount';
  discountAmount?: number;
  message?: string;
  couponId?: string;
}

/**
 * Validate a coupon code against the local database
 */
export async function validateLocalCoupon(code: string): Promise<PromoCodeValidationResponse> {
  try {
    console.log('Validating coupon code locally:', code);

    // Query the local coupons table
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Error querying coupons table:', error);
      return {
        valid: false,
        message: 'Error validating coupon code'
      };
    }

    if (!coupon) {
      console.log('Coupon not found in database:', code);
      return {
        valid: false,
        message: 'Invalid promo code'
      };
    }

    console.log('Found coupon in database:', coupon);

    // Check if coupon is valid (not expired and within usage limits)
    const validationResult = validateCouponRules(coupon);
    
    if (!validationResult.valid) {
      return validationResult;
    }

    // Return successful validation
    return {
      valid: true,
      discountType: coupon.type,
      discountAmount: parseFloat(coupon.amount.toString()),
      message: `Promo code applied: ${coupon.type === 'percentage' ? `${coupon.amount}% off` : `$${coupon.amount} off`}`,
      couponId: coupon.id
    };

  } catch (error: any) {
    console.error('Exception validating coupon:', error);
    return {
      valid: false,
      message: 'An error occurred while validating the promo code'
    };
  }
}

/**
 * Validate coupon business rules (expiration, usage limits, etc.)
 */
function validateCouponRules(coupon: CouponData): PromoCodeValidationResponse {
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

/**
 * Increment the usage count for a coupon
 */
export async function incrementCouponUsage(couponId: string): Promise<boolean> {
  try {
    console.log('Incrementing usage count for coupon:', couponId);

    const { error } = await supabase
      .from('coupons')
      .update({ 
        times_used: supabase.sql`times_used + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', couponId);

    if (error) {
      console.error('Error incrementing coupon usage:', error);
      return false;
    }

    console.log('Successfully incremented coupon usage');
    return true;
  } catch (error) {
    console.error('Exception incrementing coupon usage:', error);
    return false;
  }
}

/**
 * Get all active coupons (for admin dashboard)
 */
export async function getActiveCoupons(): Promise<CouponData[]> {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching coupons:', error);
    return [];
  }
}

/**
 * Create default/legacy coupons if they don't exist
 */
export async function createLegacyCoupons(): Promise<void> {
  try {
    console.log('Creating legacy coupons...');

    const legacyCoupons = [
      {
        code: 'TEST10',
        type: 'percentage' as const,
        amount: 10,
        valid_from: new Date().toISOString(),
        expires_at: null,
        usage_limit: null,
        stripe_id: 'legacy_test10',
        times_used: 0
      },
      {
        code: 'TEST20',
        type: 'percentage' as const,
        amount: 20,
        valid_from: new Date().toISOString(),
        expires_at: null,
        usage_limit: null,
        stripe_id: 'legacy_test20',
        times_used: 0
      },
      {
        code: 'FLAT5',
        type: 'fixed_amount' as const,
        amount: 5,
        valid_from: new Date().toISOString(),
        expires_at: null,
        usage_limit: null,
        stripe_id: 'legacy_flat5',
        times_used: 0
      }
    ];

    for (const coupon of legacyCoupons) {
      // Check if coupon already exists
      const { data: existing } = await supabase
        .from('coupons')
        .select('id')
        .eq('code', coupon.code)
        .maybeSingle();

      if (!existing) {
        console.log(`Creating legacy coupon: ${coupon.code}`);
        const { error } = await supabase
          .from('coupons')
          .insert(coupon);

        if (error) {
          console.error(`Error creating legacy coupon ${coupon.code}:`, error);
        } else {
          console.log(`Successfully created legacy coupon: ${coupon.code}`);
        }
      } else {
        console.log(`Legacy coupon ${coupon.code} already exists`);
      }
    }

    console.log('Legacy coupon creation completed');
  } catch (error) {
    console.error('Exception creating legacy coupons:', error);
  }
}

/**
 * Get coupon by code (for detailed information)
 */
export async function getCouponByCode(code: string): Promise<CouponData | null> {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Error fetching coupon by code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching coupon by code:', error);
    return null;
  }
}
