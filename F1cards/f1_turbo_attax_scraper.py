#!/usr/bin/env python3
"""
F1 Turbo Attax 2025 Card Scraper
Scrapes card data and prices from SportsCardsPro
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import json
from urllib.parse import urljoin

BASE_URL = "https://www.sportscardspro.com"
CHECKLIST_URL = "https://www.sportscardspro.com/console/racing-cards-2025-topps-f1-turbo-attax?sort=model-number"

def scrape_card_data():
    """
    Scrape all F1 Turbo Attax 2025 cards and their prices
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    all_cards = []
    
    print("Fetching checklist page...")
    response = requests.get(CHECKLIST_URL, headers=headers)
    
    if response.status_code != 200:
        print(f"Error: Failed to fetch page (Status: {response.status_code})")
        return None
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find all card rows in the table
    card_rows = soup.find_all('tr')
    
    print(f"Found {len(card_rows)} rows on the page")
    
    for row in card_rows:
        try:
            # Extract card name
            card_link = row.find('a', href=lambda x: x and '/game/racing-cards-2025-topps-f1-turbo-attax/' in x)
            if not card_link:
                continue
            
            card_name = card_link.text.strip()
            card_url = urljoin(BASE_URL, card_link['href'])
            
            # Extract prices from table cells
            cells = row.find_all('td')
            
            card_data = {
                'card_name': card_name,
                'url': card_url,
                'ungraded_price': None,
                'grade_9_price': None,
                'psa_10_price': None
            }
            
            # Prices are typically in specific column positions
            # This may need adjustment based on actual HTML structure
            if len(cells) >= 4:
                # Try to extract price values
                for i, cell in enumerate(cells):
                    price_text = cell.text.strip()
                    if price_text and price_text != '':
                        # Clean price text (remove $ and commas)
                        try:
                            price_clean = price_text.replace('$', '').replace(',', '').strip()
                            if price_clean:
                                if i == 1:
                                    card_data['ungraded_price'] = price_clean
                                elif i == 2:
                                    card_data['grade_9_price'] = price_clean
                                elif i == 3:
                                    card_data['psa_10_price'] = price_clean
                        except:
                            pass
            
            all_cards.append(card_data)
            
        except Exception as e:
            print(f"Error processing row: {e}")
            continue
    
    return all_cards

def save_to_csv(cards, filename='f1_turbo_attax_2025_checklist.csv'):
    """
    Save card data to CSV file
    """
    if not cards:
        print("No cards to save")
        return
    
    df = pd.DataFrame(cards)
    df.to_csv(filename, index=False)
    print(f"\nSaved {len(cards)} cards to {filename}")
    return df

def save_to_json(cards, filename='f1_turbo_attax_2025_checklist.json'):
    """
    Save card data to JSON file
    """
    if not cards:
        print("No cards to save")
        return
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(cards)} cards to {filename}")

def main():
    print("=" * 60)
    print("F1 Turbo Attax 2025 Card Scraper")
    print("=" * 60)
    print()
    
    # Scrape the data
    cards = scrape_card_data()
    
    if cards:
        print(f"\nTotal cards scraped: {len(cards)}")
        
        # Save to both CSV and JSON
        df = save_to_csv(cards)
        save_to_json(cards)
        
        # Display summary statistics
        print("\n" + "=" * 60)
        print("Summary:")
        print("=" * 60)
        print(f"Total cards: {len(cards)}")
        
        if df is not None:
            print("\nSample of scraped data:")
            print(df.head(10).to_string())
            
            # Show cards with prices
            cards_with_prices = df[df['ungraded_price'].notna()]
            print(f"\nCards with ungraded prices: {len(cards_with_prices)}")
    else:
        print("Failed to scrape data")

if __name__ == "__main__":
    main()
