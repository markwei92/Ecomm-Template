import { supabase } from '../lib/supabase';
import { Product, ProductImage } from '../types';

/**
 * Get all products
 */
export const getAllProducts = async (): Promise<Product[]> => {
    try {
        console.log('Fetching all products');

        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_images (
                    url,
                    color,
                    is_primary
                ),
                product_variants (
                    size,
                    color,
                    stock_quantity,
                    price_adjustment
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.log('No products found');
            return [];
        }

        console.log(`Found ${data.length} products`);

        // Transform the data to match our Product type
        const transformedProducts: Product[] = data.map(product => ({
            id: product.id,
            title: product.title,
            description: product.description || '',
            price: product.price,
            images: product.product_images.map((img: any) => ({
                color: img.color,
                url: img.url
            })),
            styles: [],
            themes: product.themes || [],
            colors: Array.from(new Set(product.product_variants.map((v: any) => v.color))),
            ageGroup: product.age_group,
            sizes: Array.from(new Set(product.product_variants.map((v: any) => v.size))),
            createdAt: product.created_at,
            canPersonalize: product.can_personalize
        }));

        return transformedProducts;
    } catch (error) {
        console.error('Exception in getAllProducts:', error);
        return [];
    }
};

/**
 * Get a product by ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
    try {
        console.log(`Fetching product with ID: ${id}`);

        if (!id) {
            console.error('Invalid product ID provided');
            return null;
        }

        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_images (
                    url,
                    color,
                    is_primary
                ),
                product_variants (
                    size,
                    color,
                    stock_quantity,
                    price_adjustment
                )
            `)
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching product:', error);
            return null;
        }

        if (!data) {
            console.warn(`No product found with ID: ${id}`);
            return null;
        }

        console.log(`Successfully fetched product: ${data.title}`);

        // Transform the data to match our Product type
        const transformedProduct: Product = {
            id: data.id,
            title: data.title,
            description: data.description || '',
            price: data.price,
            images: data.product_images.map((img: any) => ({
                color: img.color,
                url: img.url
            })),
            styles: [],
            themes: data.themes || [],
            colors: Array.from(new Set(data.product_variants.map((v: any) => v.color))),
            ageGroup: data.age_group,
            sizes: Array.from(new Set(data.product_variants.map((v: any) => v.size))),
            createdAt: data.created_at,
            canPersonalize: data.can_personalize
        };

        return transformedProduct;
    } catch (error) {
        console.error('Exception in getProductById:', error);
        return null;
    }
};

/**
 * Get product details by ID (simplified version)
 */
export const getProductDetailsById = async (id: string): Promise<any | null> => {
    try {
        console.log(`Fetching product details with ID: ${id}`);

        if (!id) {
            console.error('Invalid product ID provided');
            return null;
        }

        const { data, error } = await supabase
            .from('products')
            .select('id, title, price, description')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching product details:', error);
            return null;
        }

        if (!data) {
            console.warn(`No product found with ID: ${id}`);
            return null;
        }

        console.log(`Successfully fetched product details: ${data.title}`);
        return data;
    } catch (error) {
        console.error('Exception in getProductDetailsById:', error);
        return null;
    }
};
