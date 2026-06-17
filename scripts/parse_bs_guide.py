#!/usr/bin/env python3
"""Parse Black Souls guide HTML files into structured JSON."""
import os, json, re
from bs4 import BeautifulSoup, NavigableString

BASE = r"D:\GAMES\【合集】blacksouls\【合集】blacksouls\BS系列攻略文档ver1.03(原始网页)"

def clean_text(el):
    """Extract clean text from element, preserving <br> as newlines."""
    if el is None:
        return ""
    parts = []
    for child in el.children:
        if isinstance(child, NavigableString):
            parts.append(str(child).strip())
        elif child.name == 'br':
            parts.append('\n')
        elif child.name == 'a':
            parts.append(child.get_text(strip=True))
        elif child.name in ('b', 'strong', 'i', 'em', 'span'):
            parts.append(child.get_text(strip=True))
        else:
            parts.append(child.get_text(strip=True))
    text = ' '.join(parts)
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.replace(' \n ', '\n').replace(' \n', '\n').replace('\n ', '\n')
    return text

def parse_table(table):
    """Parse HTML table into list of dicts."""
    rows = []
    headers = []
    thead = table.find('thead')
    if thead:
        headers = [th.get_text(strip=True) for th in thead.find_all('th')]
    
    for tr in table.find_all('tr'):
        cells = []
        for td in tr.find_all(['td', 'th']):
            cells.append(clean_text(td))
        if cells:
            rows.append(cells)
    
    # If no headers found from thead, use first row
    if not headers and rows:
        headers = rows.pop(0)
    
    # Convert to list of dicts
    result = []
    for row in rows:
        item = {}
        for i, val in enumerate(row):
            key = headers[i] if i < len(headers) else f"col_{i}"
            item[key] = val
        result.append(item)
    return result

def parse_html(filepath):
    """Parse a single HTML file into structured entries."""
    with open(filepath, encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'lxml')
    
    entries = []
    current_entry = None
    
    for h2 in soup.find_all('h2'):
        title = h2.get_text(strip=True)
        if not title:
            continue
        
        entry = {
            'title': title,
            'content': '',
            'tables': []
        }
        
        # Collect content after h2 until next h2
        sibling = h2.next_sibling
        content_parts = []
        
        while sibling:
            if isinstance(sibling, NavigableString):
                text = str(sibling).strip()
                if text:
                    content_parts.append(text)
            elif sibling.name == 'h2':
                break
            elif sibling.name == 'div':
                text = clean_text(sibling)
                if text:
                    content_parts.append(text)
            elif sibling.name == 'table':
                table_data = parse_table(sibling)
                if table_data:
                    entry['tables'].append(table_data)
            elif sibling.name == 'br':
                pass
            elif sibling.name:
                text = clean_text(sibling)
                if text:
                    content_parts.append(text)
            
            sibling = sibling.next_sibling
        
        entry['content'] = '\n'.join(content_parts)
        entries.append(entry)
    
    return entries

def main():
    all_data = {}
    
    for game in ['BLACKSOULS', 'BLACKSOULSⅡ']:
        game_dir = os.path.join(BASE, game)
        if not os.path.isdir(game_dir):
            continue
        
        all_data[game] = {}
        
        for category in sorted(os.listdir(game_dir)):
            cat_dir = os.path.join(game_dir, category)
            if not os.path.isdir(cat_dir):
                continue
            
            all_data[game][category] = {}
            
            for fname in sorted(os.listdir(cat_dir)):
                if not fname.endswith('.html'):
                    continue
                
                filepath = os.path.join(cat_dir, fname)
                name = fname.replace('.html', '')
                
                try:
                    entries = parse_html(filepath)
                    all_data[game][category][name] = entries
                    print(f"  ✓ {game}/{category}/{name}: {len(entries)} entries")
                except Exception as e:
                    print(f"  ✗ {game}/{category}/{name}: {e}")
    
    # Also parse root-level files
    for fname in ['Index.html', '安装.html']:
        filepath = os.path.join(BASE, fname)
        if os.path.exists(filepath):
            entries = parse_html(filepath)
            print(f"  ✓ root/{fname}: {len(entries)} entries")
    
    # Save
    out_path = os.path.join(BASE, 'bs_wiki_data.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    # Stats
    total = 0
    for game in all_data:
        for cat in all_data[game]:
            for page in all_data[game][cat]:
                total += len(all_data[game][cat][page])
    
    print(f"\nTotal entries: {total}")
    print(f"Saved to: {out_path}")
    
    return all_data

data = main()
