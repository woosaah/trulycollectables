#!/usr/bin/env python3
"""
F1 Turbo Attax 2025 Card Scraper - Enhanced Version
Uses Selenium to handle dynamic content loading
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
import pandas as pd
import json
import time

CHECKLIST_URL = "https://www.sportscardspro.com/console/racing-cards-2025-topps-f1-turbo-attax?sort=model-number"

def setup_driver(headless=True):
    """
    Setup Chrome webdriver with options
    """
    chrome_options = Options()
    if headless:
        chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def scroll_to_load_all(driver, max_scrolls=100):
    """
    Scroll the page to load all dynamic content
    """
    print("Scrolling to load all cards...")
    last_height = driver.execute_script("return document.body.scrollHeight")
    scrolls = 0
    
    while scrolls < max_scrolls:
        # Scroll down
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)  # Wait for content to load
        
        # Calculate new scroll height
        new_height = driver.execute_script("return document.body.scrollHeight")
        
        if new_height == last_height:
            print(f"Reached bottom after {scrolls} scrolls")
            break
            
        last_height = new_height
        scrolls += 1
        
        if scrolls % 10 == 0:
            print(f"Completed {scrolls} scrolls...")
    
    return scrolls

def extract_card_data(driver):
    """
    Extract all card data from the loaded page
    """
    all_cards = []
    
    # Wait for table to load
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "table"))
        )
    except TimeoutException:
        print("Timeout waiting for table to load")
        return []
    
    # Find all table rows
    rows = driver.find_elements(By.CSS_SELECTOR, "table tr")
    print(f"Found {len(rows)} rows in table")
    
    for i, row in enumerate(rows):
        try:
            # Skip header rows
            cells = row.find_elements(By.TAG_NAME, "td")
            if not cells or len(cells) < 2:
                continue
            
            # Extract card link and name
            link_elements = row.find_elements(By.CSS_SELECTOR, "a[href*='/game/racing-cards-2025-topps-f1-turbo-attax/']")
            if not link_elements:
                continue
            
            card_link = link_elements[0]
            card_name = card_link.text.strip()
            card_url = card_link.get_attribute('href')
            
            # Extract card number from name if present
            card_number = None
            if '#' in card_name:
                parts = card_name.split('#')
                if len(parts) > 1:
                    try:
                        card_number = parts[-1].strip()
                    except:
                        pass
            
            # Extract prices from cells
            ungraded_price = None
            grade_9_price = None
            psa_10_price = None
            
            # Typically: [image, name, ungraded, grade 9, PSA 10, actions]
            if len(cells) >= 5:
                try:
                    ungraded_price = cells[2].text.strip()
                    grade_9_price = cells[3].text.strip()
                    psa_10_price = cells[4].text.strip()
                except:
                    pass
            
            card_data = {
                'card_number': card_number,
                'card_name': card_name,
                'url': card_url,
                'ungraded_price': ungraded_price if ungraded_price else None,
                'grade_9_price': grade_9_price if grade_9_price else None,
                'psa_10_price': psa_10_price if psa_10_price else None
            }
            
            all_cards.append(card_data)
            
            # Progress indicator
            if (i + 1) % 100 == 0:
                print(f"Processed {i + 1} rows...")
                
        except Exception as e:
            # Skip problematic rows
            continue
    
    return all_cards

def scrape_with_selenium():
    """
    Main scraping function using Selenium
    """
    driver = None
    try:
        print("Initializing browser...")
        driver = setup_driver(headless=False)  # Set to False to see browser
        
        print(f"Loading page: {CHECKLIST_URL}")
        driver.get(CHECKLIST_URL)
        
        # Wait for initial page load
        time.sleep(3)
        
        # Scroll to load all content
        scroll_to_load_all(driver)
        
        # Extract data
        print("\nExtracting card data...")
        cards = extract_card_data(driver)
        
        return cards
        
    except Exception as e:
        print(f"Error during scraping: {e}")
        return []
    finally:
        if driver:
            driver.quit()
            print("Browser closed")

def save_data(cards):
    """
    Save scraped data to CSV and JSON files
    """
    if not cards:
        print("No cards to save")
        return
    
    # Save to CSV
    df = pd.DataFrame(cards)
    csv_filename = 'f1_turbo_attax_2025_complete.csv'
    df.to_csv(csv_filename, index=False)
    print(f"\nSaved {len(cards)} cards to {csv_filename}")
    
    # Save to JSON
    json_filename = 'f1_turbo_attax_2025_complete.json'
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(cards)} cards to {json_filename}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total cards scraped: {len(cards)}")
    
    # Count cards with prices
    cards_with_ungraded = sum(1 for c in cards if c.get('ungraded_price'))
    cards_with_grade9 = sum(1 for c in cards if c.get('grade_9_price'))
    cards_with_psa10 = sum(1 for c in cards if c.get('psa_10_price'))
    
    print(f"Cards with ungraded price: {cards_with_ungraded}")
    print(f"Cards with Grade 9 price: {cards_with_grade9}")
    print(f"Cards with PSA 10 price: {cards_with_psa10}")
    
    # Show sample
    print("\nFirst 10 cards:")
    print(df.head(10).to_string())
    
    return df

def main():
    print("=" * 70)
    print("F1 TURBO ATTAX 2025 CARD SCRAPER - SELENIUM VERSION")
    print("=" * 70)
    print()
    print("This will scrape all 2,546+ cards from SportsCardsPro")
    print("Note: This may take several minutes to complete")
    print()
    
    # Run the scraper
    cards = scrape_with_selenium()
    
    if cards:
        save_data(cards)
    else:
        print("No cards were scraped. Please check your internet connection and try again.")

if __name__ == "__main__":
    main()
