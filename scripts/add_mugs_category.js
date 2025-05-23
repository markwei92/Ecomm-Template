import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addMugsCategory() {
  try {
    console.log('🔍 Checking existing categories...');

    // First, check what categories currently exist
    const { data: existingCategories, error: fetchError } = await supabase
      .from('product_categories')
      .select('*')
      .order('created_at');

    if (fetchError) {
      console.error('Error fetching existing categories:', fetchError);
      return;
    }

    console.log('📋 Existing categories:', existingCategories);

    // Check if Mugs category already exists
    const mugsExists = existingCategories?.some(cat => cat.slug === 'mugs');

    if (mugsExists) {
      console.log('✅ Mugs category already exists!');
      return;
    }

    console.log('➕ Adding Mugs category...');

    // Insert the Mugs category
    const { data, error } = await supabase
      .from('product_categories')
      .insert([
        {
          name: 'Mugs',
          slug: 'mugs'
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error adding Mugs category:', error);
      return;
    }

    console.log('✅ Successfully added Mugs category:', data);

    // Verify the category was added
    const { data: updatedCategories, error: verifyError } = await supabase
      .from('product_categories')
      .select('*')
      .order('created_at');

    if (verifyError) {
      console.error('Error verifying categories:', verifyError);
      return;
    }

    console.log('📋 Updated categories list:', updatedCategories);

    // Check if there are any products that should be categorized as mugs
    console.log('🔍 Checking for products that might be mugs...');

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, category')
      .or('title.ilike.%mug%,category.eq.mugs');

    if (productsError) {
      console.error('Error checking products:', productsError);
      return;
    }

    if (products && products.length > 0) {
      console.log('🍺 Found potential mug products:', products);

      // Update products that contain "mug" in the title to have mugs category
      for (const product of products) {
        if (product.title.toLowerCase().includes('mug') && product.category !== 'mugs') {
          console.log(`🔄 Updating product "${product.title}" to mugs category...`);

          const { error: updateError } = await supabase
            .from('products')
            .update({ category: 'mugs' })
            .eq('id', product.id);

          if (updateError) {
            console.error(`❌ Error updating product ${product.id}:`, updateError);
          } else {
            console.log(`✅ Updated product "${product.title}" to mugs category`);
          }
        }
      }
    } else {
      console.log('ℹ️ No mug products found to update');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
addMugsCategory()
  .then(() => {
    console.log('🎉 Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
