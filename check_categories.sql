-- Check the current state of categories and products
-- First, check the product_categories table
SELECT id, name, slug,
       CASE
           WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'Valid UUID'
           ELSE 'Invalid UUID'
       END AS id_validity
FROM product_categories
ORDER BY name;

-- Then, check the products table to see what's in the category field
SELECT id, title, category,
       CASE
           WHEN category::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'Valid UUID'
           ELSE 'Not UUID format'
       END AS category_validity
FROM products
ORDER BY title;

-- Check the data types of the columns
SELECT
    table_name,
    column_name,
    data_type
FROM
    information_schema.columns
WHERE
    table_name IN ('products', 'product_categories')
    AND column_name IN ('id', 'category')
ORDER BY
    table_name, column_name;
