import React, { useState, useRef, useEffect } from 'react';
import { Move, Type, Palette, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';

interface BannerContentEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  backgroundColor: string;
}

interface TextElement {
  id: string;
  content: string;
  position: { x: number; y: number };
  style: {
    fontSize: string;
    fontWeight: string;
    color: string;
    textAlign: 'left' | 'center' | 'right';
    fontStyle: string;
    textDecoration: string;
  };
}

export const BannerContentEditor: React.FC<BannerContentEditorProps> = ({
  initialContent,
  onChange,
  backgroundColor
}) => {
  const [elements, setElements] = useState<TextElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial content on mount
  useEffect(() => {
    try {
      // Try to parse existing HTML content
      if (initialContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(initialContent, 'text/html');
        const elements: TextElement[] = [];
        
        // Extract h1, h2, h3, p elements
        const textElements = doc.querySelectorAll('h1, h2, h3, p');
        
        textElements.forEach((el, index) => {
          // Get styles from inline style attribute
          const styleAttr = el.getAttribute('style') || '';
          const styleObj: Record<string, string> = {};
          
          styleAttr.split(';').forEach(style => {
            const [property, value] = style.split(':').map(s => s.trim());
            if (property && value) {
              styleObj[property] = value;
            }
          });
          
          elements.push({
            id: `element-${index}`,
            content: el.textContent || '',
            position: { x: 50 + (index * 10), y: 50 + (index * 30) },
            style: {
              fontSize: styleObj['font-size'] || (el.tagName === 'H1' ? '24px' : el.tagName === 'H2' ? '20px' : el.tagName === 'H3' ? '18px' : '16px'),
              fontWeight: styleObj['font-weight'] || (el.tagName.startsWith('H') ? 'bold' : 'normal'),
              color: styleObj['color'] || '#000000',
              textAlign: (styleObj['text-align'] as 'left' | 'center' | 'right') || 'center',
              fontStyle: styleObj['font-style'] || 'normal',
              textDecoration: styleObj['text-decoration'] || 'none'
            }
          });
        });
        
        if (elements.length === 0) {
          // If no elements were found, create default elements
          elements.push({
            id: 'element-0',
            content: 'Welcome to FunnyJokeTees!',
            position: { x: 50, y: 50 },
            style: {
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#000000',
              textAlign: 'center',
              fontStyle: 'normal',
              textDecoration: 'none'
            }
          });
          
          elements.push({
            id: 'element-1',
            content: 'Check out our latest collection of funny t-shirts.',
            position: { x: 50, y: 100 },
            style: {
              fontSize: '16px',
              fontWeight: 'normal',
              color: '#333333',
              textAlign: 'center',
              fontStyle: 'normal',
              textDecoration: 'none'
            }
          });
        }
        
        setElements(elements);
      }
    } catch (error) {
      console.error('Error parsing initial content:', error);
      // Set default elements
      setElements([
        {
          id: 'element-0',
          content: 'Welcome to FunnyJokeTees!',
          position: { x: 50, y: 50 },
          style: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#000000',
            textAlign: 'center',
            fontStyle: 'normal',
            textDecoration: 'none'
          }
        },
        {
          id: 'element-1',
          content: 'Check out our latest collection of funny t-shirts.',
          position: { x: 50, y: 100 },
          style: {
            fontSize: '16px',
            fontWeight: 'normal',
            color: '#333333',
            textAlign: 'center',
            fontStyle: 'normal',
            textDecoration: 'none'
          }
        }
      ]);
    }
  }, [initialContent]);

  // Update parent component when elements change
  useEffect(() => {
    const htmlContent = generateHtmlContent();
    onChange(htmlContent);
  }, [elements]);

  // Generate HTML content from elements
  const generateHtmlContent = (): string => {
    let html = '';
    elements.forEach(element => {
      const style = `
        position: absolute;
        left: ${element.position.x}px;
        top: ${element.position.y}px;
        font-size: ${element.style.fontSize};
        font-weight: ${element.style.fontWeight};
        color: ${element.style.color};
        text-align: ${element.style.textAlign};
        font-style: ${element.style.fontStyle};
        text-decoration: ${element.style.textDecoration};
      `;
      
      html += `<div style="${style}">${element.content}</div>`;
    });
    return html;
  };

  // Handle mouse down on element
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setSelectedElement(id);
    setIsDragging(true);
    
    const element = elements.find(el => el.id === id);
    if (element) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedElement && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragOffset.x;
      const newY = e.clientY - containerRect.top - dragOffset.y;
      
      setElements(elements.map(el => 
        el.id === selectedElement 
          ? { ...el, position: { x: newX, y: newY } } 
          : el
      ));
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add new text element
  const addTextElement = () => {
    const newElement: TextElement = {
      id: `element-${elements.length}`,
      content: 'New Text',
      position: { x: 100, y: 100 },
      style: {
        fontSize: '16px',
        fontWeight: 'normal',
        color: '#000000',
        textAlign: 'center',
        fontStyle: 'normal',
        textDecoration: 'none'
      }
    };
    
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  // Update element content
  const updateElementContent = (id: string, content: string) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, content } : el
    ));
  };

  // Update element style
  const updateElementStyle = (id: string, styleProperty: string, value: string) => {
    setElements(elements.map(el => 
      el.id === id ? { 
        ...el, 
        style: { 
          ...el.style, 
          [styleProperty]: value 
        } 
      } : el
    ));
  };

  // Delete selected element
  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    setSelectedElement(null);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-100 p-2 border-b flex justify-between items-center">
        <div>
          <button 
            onClick={addTextElement}
            className="bg-black text-white px-3 py-1 rounded text-sm mr-2"
          >
            Add Text
          </button>
        </div>
        <div className="text-sm text-gray-500">
          <Move className="w-4 h-4 inline mr-1" /> Drag elements to position them
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative w-full h-64 overflow-hidden"
        style={{ backgroundColor }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {elements.map(element => (
          <div
            key={element.id}
            className={`absolute cursor-move ${selectedElement === element.id ? 'ring-2 ring-blue-500' : ''}`}
            style={{
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              fontSize: element.style.fontSize,
              fontWeight: element.style.fontWeight,
              color: element.style.color,
              textAlign: element.style.textAlign,
              fontStyle: element.style.fontStyle,
              textDecoration: element.style.textDecoration
            }}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={() => setSelectedElement(element.id)}
          >
            {element.content}
          </div>
        ))}
      </div>
      
      {selectedElement && (
        <div className="p-4 border-t">
          <h4 className="font-medium mb-2">Edit Text</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Content</label>
              <input
                type="text"
                value={elements.find(el => el.id === selectedElement)?.content || ''}
                onChange={(e) => updateElementContent(selectedElement, e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Font Size</label>
                <select
                  value={elements.find(el => el.id === selectedElement)?.style.fontSize || '16px'}
                  onChange={(e) => updateElementStyle(selectedElement, 'fontSize', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="12px">12px</option>
                  <option value="14px">14px</option>
                  <option value="16px">16px</option>
                  <option value="18px">18px</option>
                  <option value="20px">20px</option>
                  <option value="24px">24px</option>
                  <option value="28px">28px</option>
                  <option value="32px">32px</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Color</label>
                <input
                  type="color"
                  value={elements.find(el => el.id === selectedElement)?.style.color || '#000000'}
                  onChange={(e) => updateElementStyle(selectedElement, 'color', e.target.value)}
                  className="w-full h-10 px-1 py-1 border rounded"
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <div className="flex space-x-1">
                <button
                  onClick={() => updateElementStyle(selectedElement, 'textAlign', 'left')}
                  className={`p-1 rounded ${elements.find(el => el.id === selectedElement)?.style.textAlign === 'left' ? 'bg-gray-200' : ''}`}
                  title="Align Left"
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  onClick={() => updateElementStyle(selectedElement, 'textAlign', 'center')}
                  className={`p-1 rounded ${elements.find(el => el.id === selectedElement)?.style.textAlign === 'center' ? 'bg-gray-200' : ''}`}
                  title="Align Center"
                >
                  <AlignCenter size={16} />
                </button>
                <button
                  onClick={() => updateElementStyle(selectedElement, 'textAlign', 'right')}
                  className={`p-1 rounded ${elements.find(el => el.id === selectedElement)?.style.textAlign === 'right' ? 'bg-gray-200' : ''}`}
                  title="Align Right"
                >
                  <AlignRight size={16} />
                </button>
              </div>
              
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    const currentWeight = elements.find(el => el.id === selectedElement)?.style.fontWeight;
                    updateElementStyle(selectedElement, 'fontWeight', currentWeight === 'bold' ? 'normal' : 'bold');
                  }}
                  className={`p-1 rounded ${elements.find(el => el.id === selectedElement)?.style.fontWeight === 'bold' ? 'bg-gray-200' : ''}`}
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button
                  onClick={() => {
                    const currentStyle = elements.find(el => el.id === selectedElement)?.style.fontStyle;
                    updateElementStyle(selectedElement, 'fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
                  }}
                  className={`p-1 rounded ${elements.find(el => el.id === selectedElement)?.style.fontStyle === 'italic' ? 'bg-gray-200' : ''}`}
                  title="Italic"
                >
                  <Italic size={16} />
                </button>
                <button
                  onClick={() => {
                    const currentDecoration = elements.find(el => el.id === selectedElement)?.style.textDecoration;
                    updateElementStyle(selectedElement, 'textDecoration', currentDecoration === 'underline' ? 'none' : 'underline');
                  }}
                  className={`p-1 rounded ${elements.find(el => el.id === selectedElement)?.style.textDecoration === 'underline' ? 'bg-gray-200' : ''}`}
                  title="Underline"
                >
                  <Underline size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex justify-end mt-2">
              <button
                onClick={() => deleteElement(selectedElement)}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
