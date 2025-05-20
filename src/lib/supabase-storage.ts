import { supabase } from './supabase';

export const uploadProductImage = async (file: File, productId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${productId}/${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError, data } = await supabase.storage
    .from('products')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(filePath);

  return publicUrl;
};