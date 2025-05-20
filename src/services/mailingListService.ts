import { supabase, supabaseAdmin } from '../lib/supabase';

interface SubscriptionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Subscribe an email to the mailing list
 * @param email The email to subscribe
 * @returns A result object with success status and message
 */
export const subscribeToMailingList = async (email: string): Promise<SubscriptionResult> => {
  try {
    console.log('Subscribing email to mailing list:', email);
    
    // Try to use the admin client if available, otherwise fall back to regular client
    const client = supabaseAdmin || supabase;
    console.log('Using client:', supabaseAdmin ? 'admin (service role)' : 'regular (anon)');
    
    // Insert the email directly
    const { data, error } = await client
      .from('mailing_list')
      .insert([{ email }])
      .select();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        console.log('Email already subscribed:', email);
        return {
          success: false,
          message: 'This email is already subscribed.'
        };
      } else {
        console.error('Error subscribing to mailing list:', error);
        return {
          success: false,
          message: `Failed to subscribe: ${error.message} (${error.code})`
        };
      }
    }
    
    console.log('Successfully subscribed email:', email, 'Response:', data);
    return {
      success: true,
      message: 'Thank you for subscribing!',
      data
    };
  } catch (error: any) {
    console.error('Exception subscribing to mailing list:', error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message || 'Unknown error'}`
    };
  }
};
