import fitz  # PyMuPDF
import os
import json
from PIL import Image
import io

def extract_pdf_content(pdf_path, output_dir):
    """Extract images and text from PDF"""
    
    # Create output directories
    images_dir = os.path.join(output_dir, 'images')
    os.makedirs(images_dir, exist_ok=True)
    
    try:
        # Open PDF
        pdf_document = fitz.open(pdf_path)
        print(f"PDF has {len(pdf_document)} pages")
        
        extracted_data = {
            "products": [],
            "images": [],
            "text_content": []
        }
        
        # Extract content from each page
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            
            # Extract text
            text = page.get_text()
            if text.strip():
                extracted_data["text_content"].append({
                    "page": page_num + 1,
                    "text": text
                })
            
            # Extract images
            image_list = page.get_images(full=True)
            
            for img_index, img in enumerate(image_list):
                # Get image data
                xref = img[0]
                pix = fitz.Pixmap(pdf_document, xref)
                
                # Convert to PIL Image
                if pix.n - pix.alpha < 4:  # GRAY or RGB
                    img_data = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_data))
                    
                    # Save image
                    image_filename = f"product_{page_num+1}_{img_index+1}.png"
                    image_path = os.path.join(images_dir, image_filename)
                    image.save(image_path)
                    
                    extracted_data["images"].append({
                        "page": page_num + 1,
                        "filename": image_filename,
                        "path": image_path
                    })
                    
                    print(f"Extracted image: {image_filename}")
                
                pix = None
        
        # Save extracted data
        with open(os.path.join(output_dir, 'extracted_data.json'), 'w', encoding='utf-8') as f:
            json.dump(extracted_data, f, indent=2, ensure_ascii=False)
        
        pdf_document.close()
        return extracted_data
        
    except Exception as e:
        print(f"Error extracting PDF content: {e}")
        return None

def parse_product_data(text_content):
    """Parse text content to extract product information"""
    products = []
    
    for page_data in text_content:
        text = page_data["text"]
        lines = text.split('\n')
        
        # Try to identify product information patterns
        current_product = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for patterns that might indicate product names, prices, etc.
            if any(keyword in line.lower() for keyword in ['statue', 'figurine', 'sculpture', 'piece']):
                if 'name' not in current_product:
                    current_product['name'] = line
            
            # Look for price patterns (₹ symbol or numbers)
            if '₹' in line or any(char.isdigit() for char in line):
                if 'price_text' not in current_product:
                    current_product['price_text'] = line
            
            # Look for weight/dimension patterns
            if any(unit in line.lower() for unit in ['kg', 'cm', 'mm', 'gm']):
                if 'specifications' not in current_product:
                    current_product['specifications'] = line
        
        if current_product:
            current_product['page'] = page_data['page']
            current_product['full_text'] = text
            products.append(current_product)
    
    return products

if __name__ == "__main__":
    pdf_path = "../Silver Statue Catalogue.pdf"
    output_dir = "."
    
    if os.path.exists(pdf_path):
        print("Extracting content from PDF...")
        extracted_data = extract_pdf_content(pdf_path, output_dir)
        
        if extracted_data:
            print(f"Extracted {len(extracted_data['images'])} images")
            print(f"Extracted text from {len(extracted_data['text_content'])} pages")
            
            # Parse product data
            products = parse_product_data(extracted_data['text_content'])
            print(f"Identified {len(products)} potential products")
            
            # Save product data
            with open('products_data.json', 'w', encoding='utf-8') as f:
                json.dump(products, f, indent=2, ensure_ascii=False)
            
            print("Extraction complete!")
        else:
            print("Failed to extract PDF content")
    else:
        print(f"PDF file not found: {pdf_path}")