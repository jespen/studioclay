'use client';

import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { Product } from './types';

const initialProducts: Product[] = [
  {
    id: '1',
    title: 'KORG MED HANDTAG',
    price: 160,
    image: '/pictures/gronvas.jpg',
    isNew: true,
    description: 'En stilfull korg med handtag, perfekt för förvaring eller som en dekorativ inredningsdetalj.',
    discount: null,
  },
  {
    id: '2',
    title: 'BLOMVAS',
    price: 170,
    originalPrice: 210,
    image: '/pictures/vasmedblomma.jpg',
    isNew: true,
    description: 'Elegant blomvas med detaljer, perfekt för färska eller torkade blommor.',
    discount: 19,
  },
  {
    id: '3',
    title: 'DEKORATION',
    price: 35,
    image: '/pictures/ljuslykta.jpg',
    isNew: false,
    description: 'Dekorativ inredningsdetalj som tillför textur och charm till alla utrymmen.',
    discount: null,
  },
  {
    id: '4',
    title: 'VÄGGPRYDNAD',
    price: 110,
    image: '/pictures/skålmedprickar.jpg',
    isNew: true,
    description: 'Minimalistisk väggdekoration med rena linjer för en modern estetik.',
    discount: null,
  },
  {
    id: '5',
    title: 'FÖRVARINGSDETALJ',
    price: 90,
    image: '/pictures/finavaser.jpg',
    isNew: false,
    description: 'Väggmonterad förvaringslösning med stilren design och praktisk funktion.',
    discount: null,
  },
  {
    id: '6',
    title: 'KERAMIKVAS',
    price: 60,
    image: '/pictures/ljuslyktorblåa.jpg',
    isNew: false,
    description: 'Handgjord keramikvas i neutrala toner, var och en med unika texturer och finish.',
    discount: null,
  },
  {
    id: '7',
    title: 'DEKORATIONSDETALJ',
    price: 24,
    originalPrice: 30,
    image: '/pictures/skålmedprickar2.jpg',
    isNew: false,
    description: 'Elegant dekorationsdetalj, perfekt som accent för vilket rum som helst.',
    discount: 20,
  },
  {
    id: '8',
    title: 'KAFFEKOPP SET',
    price: 240,
    image: '/pictures/kaffemuggar.jpg',
    isNew: true,
    description: 'Modernt kaffekopp-set med vacker design och praktisk funktion.',
    discount: null,
  },
];

const Shop = () => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In the future, we'll fetch products from Supabase here
  // useEffect(() => {
  //   async function fetchProducts() {
  //     setLoading(true);
  //     try {
  //       // const { data, error } = await supabase
  //       //   .from('products')
  //       //   .select('*')
  //       //   .order('created_at', { ascending: false });
  //       
  //       // if (error) throw error;
  //       // setProducts(data);
  //       setLoading(false);
  //     } catch (err) {
  //       console.error('Error fetching products:', err);
  //       setError('Failed to load products');
  //       setLoading(false);
  //     }
  //   }
  //   
  //   fetchProducts();
  // }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <p>Laddar produkter...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4 md:px-6">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-serif mb-2">Shop</h2>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
          Handplockade keramikföremål och tillbehör som förhöjer ditt hem med Studio Clays unika estetik.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <button className="btn btn-outline px-6 py-3 uppercase tracking-wider">
          Visa alla produkter
        </button>
      </div>
    </div>
  );
};

export default Shop; 