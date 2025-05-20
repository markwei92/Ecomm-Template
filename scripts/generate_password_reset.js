// This script generates a password reset link for a user
// Run with: node scripts/generate_password_reset.js your-email@example.com

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generatePasswordReset() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('Please provide an email address');
      console.error('Usage: node scripts/generate_password_reset.js your-email@example.com');
      process.exit(1);
    }
    
    console.log(`Generating password reset for: ${email}`);
    
    // Send password reset email
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/reset-password`,
    });
    
    if (error) {
      console.error('Error generating password reset:', error);
      process.exit(1);
    }
    
    console.log('Password reset email sent successfully');
    console.log('Check your email for the password reset link');
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

generatePasswordReset();
