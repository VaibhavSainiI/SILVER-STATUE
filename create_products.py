import json
import re
import os

def parse_weight(weight_text):
    """Extract weight in grams from text"""
    if not weight_text:
        return None
    
    # Look for weight patterns
    weight_match = re.search(r'(\d+)\s*gram', weight_text.lower())
    if weight_match:
        return int(weight_match.group(1))
    return None

def parse_dimensions(text):
    """Extract dimensions from text"""
    if not text:
        return None
    
    # Look for dimension patterns like "20cm" or "20cm x 15cm"
    dimensions = re.findall(r'(\d+(?:\.\d+)?)\s*cm', text.lower())
    if dimensions:
        if len(dimensions) >= 2:
            return f"{dimensions[0]}cm x {dimensions[1]}cm"
        else:
            return f"{dimensions[0]}cm"
    return None

def categorize_product(name):
    """Categorize product based on name"""
    name_lower = name.lower()
    
    if any(word in name_lower for word in ['ganesha', 'ganesh', 'vigneshwara']):
        return 'religious'
    elif any(word in name_lower for word in ['elephant', 'royal elephant', 'gaja']):
        return 'animals'
    elif any(word in name_lower for word in ['horse', 'horses']):
        return 'animals'
    elif any(word in name_lower for word in ['swan', 'bird', 'sparrow']):
        return 'animals'
    elif any(word in name_lower for word in ['tortoise', 'turtle']):
        return 'animals'
    elif any(word in name_lower for word in ['camel']):
        return 'animals'
    elif any(word in name_lower for word in ['cow', 'mother']):
        return 'animals'
    elif any(word in name_lower for word in ['mushroom', 'tree']):
        return 'nature'
    elif any(word in name_lower for word in ['royal', 'heritage', 'antic']):
        return 'royal'
    else:
        return 'animals'  # Default category

def estimate_price(weight_grams, category):
    """Estimate price based on weight and category"""
    if not weight_grams:
        weight_grams = 500  # Default weight
    
    base_price_per_gram = {
        'religious': 8,
        'royal': 12,
        'animals': 6,
        'nature': 5
    }
    
    base_rate = base_price_per_gram.get(category, 6)
    estimated_price = weight_grams * base_rate
    
    # Round to nearest 99 for realistic pricing
    price = round(estimated_price / 100) * 100 - 1
    if price < 999:
        price = 999
    
    return price

def create_product_database():
    """Create comprehensive product database from extracted data"""
    
    # Load extracted data
    with open('products_data.json', 'r', encoding='utf-8') as f:
        raw_products = json.load(f)
    
    products = []
    product_id = 1
    
    # Group raw data by product names
    product_groups = {}
    for item in raw_products:
        if 'name' in item:
            key = item['name'].strip()
            if key not in product_groups:
                product_groups[key] = []
            product_groups[key].append(item)
    
    # Add specifications for products that have them
    for item in raw_products:
        if 'specifications' in item or 'price_text' in item:
            # Find the most recent product name before this spec
            for key in product_groups.keys():
                if any(prod['page'] < item['page'] for prod in product_groups[key]):
                    # Find the closest product name page
                    closest_product = None
                    min_distance = float('inf')
                    for prod in product_groups[key]:
                        if prod['page'] < item['page']:
                            distance = item['page'] - prod['page']
                            if distance < min_distance:
                                min_distance = distance
                                closest_product = prod
                    
                    if closest_product and min_distance <= 2:  # Within 2 pages
                        product_groups[key].append(item)
                        break
    
    # Create products from groups
    for product_name, items in product_groups.items():
        if not product_name or len(product_name) < 5:
            continue
            
        # Extract specifications
        weight = None
        dimensions = None
        specs_text = ""
        
        for item in items:
            if 'specifications' in item:
                specs_text += item['specifications'] + " "
                weight = parse_weight(item.get('full_text', ''))
                if not dimensions:
                    dimensions = parse_dimensions(item.get('full_text', ''))
            elif 'full_text' in item:
                weight_from_text = parse_weight(item['full_text'])
                if weight_from_text:
                    weight = weight_from_text
                if not dimensions:
                    dimensions = parse_dimensions(item['full_text'])
        
        # Find associated images
        main_page = items[0]['page']
        images = []
        
        # Look for images from the same page and nearby pages
        for page_num in range(max(1, main_page - 1), min(41, main_page + 3)):
            page_images = [f"product_{page_num}_{i}.png" for i in range(1, 15)]
            for img in page_images:
                if os.path.exists(f"images/{img}"):
                    images.append(img)
        
        # Take first 3 images as primary images
        primary_images = images[:3] if images else [f"product_{main_page}_1.png"]
        
        category = categorize_product(product_name)
        estimated_price = estimate_price(weight, category)
        
        # Clean up product name
        clean_name = product_name.replace('Silver-Plating Statue', 'Silver Statue').strip()
        
        # Create product description
        description = f"Exquisite {clean_name.lower()} crafted with precision and attention to detail. "
        if weight:
            description += f"This beautiful piece weighs approximately {weight}g and "
        description += "features 999 silver plating with an oxidized antique finish for a luxurious appearance."
        
        product = {
            "id": product_id,
            "name": clean_name,
            "price": estimated_price,
            "description": description,
            "category": category,
            "rating": 4 + (product_id % 2),  # Alternate between 4 and 5 stars
            "reviews": 20 + (product_id * 7) % 80,  # Generate realistic review counts
            "images": primary_images,
            "inStock": True,
            "weight": f"{weight}g" if weight else "500g",
            "dimensions": dimensions or "15cm x 12cm",
            "material": "Resin with 999 Silver Plating",
            "badge": "new" if product_id <= 5 else ("bestseller" if product_id % 3 == 0 else None),
            "dateAdded": f"2024-{(product_id % 12) + 1:02d}-{(product_id % 28) + 1:02d}",
            "specifications": specs_text.strip() or "Oxidized finish for antique look"
        }
        
        products.append(product)
        product_id += 1
        
        if product_id > 30:  # Limit to 30 products for now
            break
    
    return products

def main():
    print("Creating product database from extracted PDF data...")
    
    products = create_product_database()
    
    print(f"Created {len(products)} products")
    
    # Save to JSON file
    with open('final_products.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    # Generate JavaScript file
    js_content = f"""// Generated products from PDF extraction
const pdfProducts = {json.dumps(products, indent=2, ensure_ascii=False)};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = pdfProducts;
}}

// Make available globally
window.pdfProducts = pdfProducts;
"""
    
    with open('js/pdf_products.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print("Product database created successfully!")
    print("Files generated:")
    print("- final_products.json")
    print("- js/pdf_products.js")
    
    # Print summary
    categories = {}
    for product in products:
        cat = product['category']
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1
    
    print(f"\nProduct distribution:")
    for cat, count in categories.items():
        print(f"- {cat.title()}: {count} products")

if __name__ == "__main__":
    main()