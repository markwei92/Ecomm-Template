import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const DiagnosticPage: React.FC = () => {
  const [results, setResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sqlQuery, setSqlQuery] = useState<string>(`
-- Check if product_categories table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'product_categories'
);

-- List all tables in the public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
  `);

  const runQuery = async () => {
    setIsLoading(true);
    try {
      // Since we can't run arbitrary SQL, let's check what tables exist
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .limit(10);

      if (error) {
        setResults(`Error accessing product_categories table: ${error.message}`);
        return;
      }

      setResults(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResults(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createTable = async () => {
    setIsLoading(true);
    try {
      setResults('Note: We cannot directly create tables through the Supabase client API.\n\n' +
        'Instead, we will try to insert a default category and see if it works:');

      // Try to insert a default category
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          name: 'T-Shirts',
          slug: 't-shirts'
        })
        .select();

      if (error) {
        setResults(prev => `${prev}\n\nError inserting default category: ${error.message}`);

        if (error.message.includes('does not exist')) {
          setResults(prev => `${prev}\n\nThe product_categories table does not exist. You need to create it in the Supabase dashboard or using migrations.`);
        } else if (error.message.includes('duplicate key')) {
          setResults(prev => `${prev}\n\nThe default category already exists, which means the table exists!`);

          // Check the table
          const { data: checkData, error: checkError } = await supabase
            .from('product_categories')
            .select('*');

          if (checkError) {
            setResults(prev => `${prev}\n\nError checking table: ${checkError.message}`);
          } else {
            setResults(prev => `${prev}\n\nTable contents:\n${JSON.stringify(checkData, null, 2)}`);
          }
        }
        return;
      }

      setResults(prev => `${prev}\n\nCategory inserted successfully, which means the table exists!\n\n${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      setResults(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const insertCategory = async () => {
    setIsLoading(true);
    try {
      // Generate a random name to avoid duplicate key errors
      const randomSuffix = Math.floor(Math.random() * 1000);
      const categoryName = `Test Category ${randomSuffix}`;
      const categorySlug = `test-category-${randomSuffix}`;

      // Insert using standard Supabase methods
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          name: categoryName,
          slug: categorySlug
        })
        .select();

      if (error) {
        setResults(`Error inserting category: ${error.message}`);
        return;
      }

      setResults(`Category inserted successfully!\n\n${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      setResults(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Database Diagnostic Tool</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
        <div className="flex space-x-4">
          <button
            onClick={createTable}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Create Table
          </button>
          <button
            onClick={insertCategory}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Insert Test Category
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Custom SQL Query</h2>
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          className="w-full h-40 p-2 border border-gray-300 rounded font-mono"
        />
        <button
          onClick={runQuery}
          disabled={isLoading}
          className="mt-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
        >
          Run Query
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Results</h2>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <pre className="bg-gray-100 p-4 rounded overflow-auto h-80 font-mono text-sm">
            {results || 'No results yet. Run a query to see results.'}
          </pre>
        )}
      </div>
    </div>
  );
};

export default DiagnosticPage;
