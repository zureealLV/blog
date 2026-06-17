#!/usr/bin/env python3
"""Parse Black Souls guide HTML files into structured JSON with h3/h4 sub-sections."""
import os, json, re
from bs4 import BeautifulSoup, NavigableString

BASE = r"D:\GAMES\【合集】blacksouls\【合集】blacksouls\BS系列攻略文档ver1.03(原始网页)"

def clean_text(el):
    """Extract clean text from element, preserving structure."""
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
        elif child.name in ('b', 'strong'):
            parts.append(f"**{child.get_text(strip=True)}**")
        elif child.name == 'span' and child.get('style', '').find('bold') >= 0:
            parts.append(f"**{child.get_text(strip=True)}**")
        elif child.name == 'i' or child.name == 'em':
            parts.append(f"*{child.get_text(strip=True)}*")
        elif child.name == 'ul':
            for li in child.find_all('li', recursive=False):
                parts.append(f"\n- {li.get_text(strip=True)}")
        elif child.name == 'ol':
            for i, li in enumerate(child.find_all('li', recursive=False), 1):
                parts.append(f"\n{i}. {li.get_text(strip=True)}")
        else:
            parts.append(child.get_text(strip=True))
    text = ' '.join(parts)
    text = re.sub(r'[ \t]+', ' ', text).strip()
    text = text.replace(' \n ', '\n').replace(' \n', '\n').replace('\n ', '\n')
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text

def parse_table(table):
    """Parse HTML table into list of dicts."""
    headers = []
    thead = table.find('thead')
    if thead:
        headers = [th.get_text(strip=True) for th in thead.find_all('th')]
    
    rows = []
    for tr in table.find_all('tr'):
        cells = []
        for td in tr.find_all(['td', 'th']):
            cells.append(clean_text(td))
        if cells:
            rows.append(cells)
    
    if not headers and rows:
        headers = rows.pop(0)
    
    # Filter duplicate header row
    if rows and headers:
        first_vals = rows[0][:len(headers)]
        if first_vals == headers[:len(first_vals)]:
            rows = rows[1:]
    
    result = []
    for row in rows:
        item = {}
        for i, val in enumerate(row):
            key = headers[i] if i < len(headers) else f"col_{i}"
            item[key] = val
        result.append(item)
    return result, headers

def parse_html(filepath):
    """Parse a single HTML file into structured entries with blocks."""
    with open(filepath, encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'lxml')
    
    entries = []
    
    for h2 in soup.find_all('h2'):
        title = h2.get_text(strip=True)
        if not title:
            continue
        
        entry = {
            'title': title,
            'blocks': []
        }
        
        sibling = h2.next_sibling
        
        while sibling:
            if isinstance(sibling, NavigableString):
                text = str(sibling).strip()
                if text:
                    _append_text(entry['blocks'], text)
            
            elif sibling.name == 'h2':
                break
            
            elif sibling.name == 'h3':
                h3_title = sibling.get_text(strip=True)
                if h3_title:
                    entry['blocks'].append({'type': 'h3', 'text': h3_title})
            
            elif sibling.name == 'h4':
                h4_title = sibling.get_text(strip=True)
                if h4_title:
                    entry['blocks'].append({'type': 'h4', 'text': h4_title})
            
            elif sibling.name == 'div':
                text = clean_text(sibling)
                if text:
                    _append_text(entry['blocks'], text)
            
            elif sibling.name == 'table':
                table_data, headers = parse_table(sibling)
                if table_data:
                    entry['blocks'].append({'type': 'table', 'data': table_data, 'headers': headers})
            
            elif sibling.name == 'ul':
                items = []
                for li in sibling.find_all('li', recursive=False):
                    items.append(clean_text(li))
                if items:
                    entry['blocks'].append({'type': 'list', 'items': items})
            
            elif sibling.name == 'ol':
                items = []
                for li in sibling.find_all('li', recursive=False):
                    items.append(clean_text(li))
                if items:
                    entry['blocks'].append({'type': 'ordered_list', 'items': items})
            
            elif sibling.name == 'p':
                text = clean_text(sibling)
                if text:
                    _append_text(entry['blocks'], text)
            
            elif sibling.name == 'br':
                pass
            
            elif sibling.name == 'span':
                text = clean_text(sibling)
                if text:
                    _append_text(entry['blocks'], text)
            
            elif sibling.name:
                text = clean_text(sibling)
                if text:
                    _append_text(entry['blocks'], text)
            
            sibling = sibling.next_sibling
        
        # Merge consecutive text blocks
        entry['blocks'] = _merge_text_blocks(entry['blocks'])
        entries.append(entry)
    
    return entries

def _append_text(blocks, text):
    """Append text to the last block if it's a text block, otherwise create new one."""
    if blocks and blocks[-1]['type'] == 'text':
        blocks[-1]['text'] += '\n' + text
    else:
        blocks.append({'type': 'text', 'text': text})

def _merge_text_blocks(blocks):
    """Merge consecutive text blocks into one."""
    merged = []
    for block in blocks:
        if merged and merged[-1]['type'] == 'text' and block['type'] == 'text':
            merged[-1]['text'] += '\n' + block['text']
        else:
            merged.append(block)
    # Remove empty blocks
    return [b for b in merged if b.get('text', '').strip() or b.get('items') or b.get('data')]

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
                    total_blocks = sum(len(e['blocks']) for e in entries)
                    h3_count = sum(1 for e in entries for b in e['blocks'] if b['type'] == 'h3')
                    h4_count = sum(1 for e in entries for b in e['blocks'] if b['type'] == 'h4')
                    print(f"  ✓ {game}/{category}/{name}: {len(entries)} entries, {total_blocks} blocks (h3={h3_count}, h4={h4_count})")
                except Exception as e:
                    print(f"  ✗ {game}/{category}/{name}: {e}")
    
    # Flatten
    flat = []
    for game in all_data:
        for cat in all_data[game]:
            for page in all_data[game][cat]:
                for entry in all_data[game][cat][page]:
                    flat.append({
                        'game': game,
                        'category': cat,
                        'page': page,
                        'title': entry['title'],
                        'blocks': entry['blocks'],
                        'id': f"{game}/{cat}/{page}/{entry['title']}"
                    })
    
    # Save compact JSON
    out_path = os.path.join(BASE, 'bs_wiki_flat_v2.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(flat, f, ensure_ascii=False, separators=(',', ':'))
    
    size = os.path.getsize(out_path)
    print(f"\nTotal entries: {len(flat)}")
    print(f"JSON size: {size/1024:.1f}KB")
    print(f"Saved to: {out_path}")
    
    return flat

data = main()
