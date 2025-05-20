import React, { useState, useRef, useEffect } from 'react';
import { Product, Size, Color } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { MiniCartNotification } from './MiniCartNotification';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const [selectedSize, setSelectedSize] = React.useState<Size>(product.sizes[0]);
  const [selectedColor, setSelectedColor] = React.useState<Color>(product.colors[0]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [showMiniNotification, setShowMiniNotification] = useState(false);

  const timeoutRef = useRef<number>();
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        productId: product.id,
        title: product.title,
        quantity: 1,
        size: selectedSize,
        color: selectedColor,
        price: product.price,
        image: product.images[0].url
      },
    });

    // Show mini notification
    setShowMiniNotification(true);
  };

  const handleColorChange = (e: React.MouseEvent, color: Color) => {
    e.preventDefault(); // Prevent navigation when changing color
    if (isAnimating) return;
    setSelectedColor(color);
    const newIndex = product.images.findIndex(img => img.color === color);
    if (newIndex !== -1 && newIndex !== currentImageIndex) {
      const direction = newIndex > currentImageIndex ? 'right' : 'left';
      slideToImage(newIndex, direction);
    }
  };

  const slideToImage = (targetIndex: number, direction: 'left' | 'right') => {
    if (targetIndex < 0 || targetIndex >= product.images.length || isAnimating) return;

    setIsAnimating(true);
    setSlideDirection(direction);

    const carousel = carouselRef.current;
    if (!carousel) return;

    const nextImage = document.createElement('div');
    nextImage.className = 'absolute inset-0 w-full h-full';
    nextImage.style.zIndex = '1';

    if (direction === 'right') {
      nextImage.style.transform = 'translateX(100%)';
    } else {
      nextImage.style.transform = 'translateX(-100%)';
    }

    const img = document.createElement('img');
    img.src = product.images[targetIndex].url;
    img.alt = `${product.title} in ${product.images[targetIndex].color}`;
    img.className = 'w-full h-full object-cover';

    nextImage.appendChild(img);
    carousel.appendChild(nextImage);

    nextImage.offsetHeight;

    const currentImageEl = carousel.querySelector('.current-image') as HTMLElement;
    if (currentImageEl) {
      currentImageEl.style.transition = 'transform 300ms ease-in-out';
      currentImageEl.style.transform = direction === 'right' ? 'translateX(-100%)' : 'translateX(100%)';
    }

    nextImage.style.transition = 'transform 300ms ease-in-out';
    nextImage.style.transform = 'translateX(0)';

    timeoutRef.current = window.setTimeout(() => {
      setCurrentImageIndex(targetIndex);
      setIsAnimating(false);

      if (carousel.contains(nextImage)) {
        carousel.removeChild(nextImage);
      }

      if (currentImageEl) {
        currentImageEl.style.transition = '';
        currentImageEl.style.transform = '';
      }
    }, 300);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking navigation buttons
    if (isAnimating || product.images.length <= 1) return;
    const targetIndex = currentImageIndex === 0
      ? product.images.length - 1
      : currentImageIndex - 1;
    slideToImage(targetIndex, 'left');
    setSelectedColor(product.images[targetIndex].color);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking navigation buttons
    if (isAnimating || product.images.length <= 1) return;
    const targetIndex = currentImageIndex === product.images.length - 1
      ? 0
      : currentImageIndex + 1;
    slideToImage(targetIndex, 'right');
    setSelectedColor(product.images[targetIndex].color);
  };

  return (
    <>
      <MiniCartNotification
        isVisible={showMiniNotification}
        productTitle={product.title}
        onClose={() => setShowMiniNotification(false)}
      />
      <Link to={`/products/${product.id}`} className="bg-white rounded-lg shadow-md overflow-hidden group relative">
        <div className="relative w-full h-64 overflow-hidden">
          <div className="h-full">
            <img
              src={product.images[0].url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {product.canPersonalize === true && (
            <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Personalizable
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-black mb-1">{product.title}</h3>
          <p className="text-xl font-bold text-black">${product.price.toFixed(2)}</p>
        </div>
      </Link>
    </>
  );
};