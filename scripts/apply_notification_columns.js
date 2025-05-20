// This script manually applies the notification columns migration
// Run with: node scripts/apply_notification_columns.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

async function applyMigration() {
  console.log('Applying notification columns migration...');

  try {
    // Add viewed column to stripe_orders table
    console.log('Adding viewed column to stripe_orders table...');
    try {
      const { error: ordersError } = await supabase.rpc('execute_sql', {
        sql_query: "ALTER TABLE IF EXISTS public.stripe_orders ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE"
      });

      if (ordersError) {
        console.error('Error adding viewed column to stripe_orders:', ordersError);
      } else {
        console.log('Successfully added viewed column to stripe_orders');
      }
    } catch (error) {
      console.error('Error executing RPC for stripe_orders:', error);
    }

    // Add viewed column to inquiries table
    console.log('Adding viewed column to inquiries table...');
    try {
      const { error: inquiriesError } = await supabase.rpc('execute_sql', {
        sql_query: "ALTER TABLE IF EXISTS public.inquiries ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE"
      });

      if (inquiriesError) {
        console.error('Error adding viewed column to inquiries:', inquiriesError);
      } else {
        console.log('Successfully added viewed column to inquiries');
      }
    } catch (error) {
      console.error('Error executing RPC for inquiries:', error);
    }

    // Create user_notifications table
    console.log('Creating user_notifications table...');
    try {
      const { error: tableError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS public.user_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            viewed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );

          -- Enable RLS on user_notifications
          ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

          -- Create policy for admin access to user_notifications
          DROP POLICY IF EXISTS "Admins can manage user_notifications" ON public.user_notifications;
          CREATE POLICY "Admins can manage user_notifications"
            ON public.user_notifications
            USING (auth.uid() IN (SELECT user_id FROM public.admin_users));
        `
      });

      if (tableError) {
        console.error('Error creating user_notifications table:', tableError);
      } else {
        console.log('Successfully created user_notifications table');
      }
    } catch (error) {
      console.error('Error executing RPC for user_notifications table:', error);
    }

    // Create trigger function
    console.log('Creating trigger function...');
    try {
      const { error: functionError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE OR REPLACE FUNCTION create_user_notification()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO public.user_notifications (user_id)
            VALUES (NEW.id);
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `
      });

      if (functionError) {
        console.error('Error creating trigger function:', functionError);
      } else {
        console.log('Successfully created trigger function');
      }
    } catch (error) {
      console.error('Error executing RPC for trigger function:', error);
    }

    // Create trigger
    console.log('Creating trigger...');
    try {
      const { error: triggerError } = await supabase.rpc('execute_sql', {
        sql_query: `
          DROP TRIGGER IF EXISTS on_user_created ON auth.users;
          CREATE TRIGGER on_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION create_user_notification();
        `
      });

      if (triggerError) {
        console.error('Error creating trigger:', triggerError);
      } else {
        console.log('Successfully created trigger');
      }
    } catch (error) {
      console.error('Error executing RPC for trigger:', error);
    }

    // Create indexes
    console.log('Creating indexes...');
    try {
      const { error: indexError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE INDEX IF NOT EXISTS idx_stripe_orders_viewed ON public.stripe_orders(viewed);
          CREATE INDEX IF NOT EXISTS idx_inquiries_viewed ON public.inquiries(viewed);
          CREATE INDEX IF NOT EXISTS idx_user_notifications_viewed ON public.user_notifications(viewed);
        `
      });

      if (indexError) {
        console.error('Error creating indexes:', indexError);
      } else {
        console.log('Successfully created indexes');
      }
    } catch (error) {
      console.error('Error executing RPC for indexes:', error);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();
