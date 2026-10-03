# F1 Turbo Attax 2025 Card Scraper

This project contains Python scripts to scrape all F1 Turbo Attax 2025 trading cards and their prices from SportsCardsPro.

## What You Get

The scraper will collect:
- **2,546+ total cards** from the 2025 Topps F1 Turbo Attax set
- Card names and numbers
- Ungraded prices
- Grade 9 prices  
- PSA 10 prices
- Direct URLs to each card

## Files Included

1. **f1_turbo_attax_scraper.py** - Basic scraper using requests/BeautifulSoup
2. **f1_turbo_attax_scraper_selenium.py** - Enhanced scraper using Selenium (RECOMMENDED)
3. **requirements.txt** - Required Python packages

## Installation

### Step 1: Install Required Packages

```bash
pip install -r requirements.txt
```

### Step 2: Install Chrome Browser
The Selenium version requires Google Chrome and ChromeDriver.

**Option A: Automatic (recommended)**
```bash
pip install webdriver-manager
```

**Option B: Manual**
- Download ChromeDriver from: https://chromedriver.chromium.org/
- Make sure it matches your Chrome version
- Add to system PATH

## Usage

### Option 1: Selenium Scraper (RECOMMENDED)

This version handles dynamic content loading and will get all 2,546+ cards:

```bash
python f1_turbo_attax_scraper_selenium.py
```

**What it does:**
- Opens Chrome browser
- Scrolls through all pages to load all cards
- Extracts card data and prices
- Saves to CSV and JSON files

**Output files:**
- `f1_turbo_attax_2025_complete.csv`
- `f1_turbo_attax_2025_complete.json`

**Note:** This will take 5-10 minutes to complete as it loads all 2,546 cards.

### Option 2: Basic Scraper

Faster but may not capture all cards due to dynamic loading:

```bash
python f1_turbo_attax_scraper.py
```

**Output files:**
- `f1_turbo_attax_2025_checklist.csv`
- `f1_turbo_attax_2025_checklist.json`

## Output Format

### CSV Columns
- `card_number` - Card number (e.g., "1", "2", etc.)
- `card_name` - Full card name (e.g., "Max Verstappen #1")
- `url` - Direct link to card on SportsCardsPro
- `ungraded_price` - Current ungraded price
- `grade_9_price` - Current Grade 9 price
- `psa_10_price` - Current PSA 10 price

### Example Data
```csv
card_number,card_name,url,ungraded_price,grade_9_price,psa_10_price
1,Rainmaster #1,https://www.sportscardspro.com/game/...,,,
2,DRS #2,https://www.sportscardspro.com/game/...,,,
```

## Card Types Included

The scraper captures all card types:
- Base cards
- Limited Editions (LE1-LE25+)
- Diamond Edge parallels
- Numbered parallels (/299, /75, /1)
- Team cards
- F2 cards
- Insert sets (Rain Masters, DRS, etc.)
- Special subsets

## Troubleshooting

### "Module not found" errors
```bash
pip install -r requirements.txt
```

### Selenium not finding Chrome
- Make sure Chrome is installed
- Install webdriver-manager: `pip install webdriver-manager`

### Scraper timing out
- Increase wait times in the script
- Check your internet connection
- Try running during off-peak hours

### Not all cards captured
- Use the Selenium version (`f1_turbo_attax_scraper_selenium.py`)
- Increase `max_scrolls` parameter in the script

## Customization

### Change output location
Edit these lines in the script:
```python
csv_filename = 'f1_turbo_attax_2025_complete.csv'
json_filename = 'f1_turbo_attax_2025_complete.json'
```

### Adjust scraping speed
In Selenium script, modify:
```python
time.sleep(2)  # Increase for slower internet
```

### Run in background (headless mode)
Change in `setup_driver()`:
```python
driver = setup_driver(headless=True)  # Was False
```

## Important Notes

1. **Be Respectful**: Don't run the scraper too frequently. SportsCardsPro provides this data for free.

2. **Prices Change**: Card prices fluctuate constantly based on eBay sales and market demand.

3. **Rate Limiting**: If you get blocked, wait a few hours before trying again.

4. **Data Accuracy**: The scraper collects data as displayed on the website. Verify important information manually.

## Data Source

All data is scraped from:
https://www.sportscardspro.com/console/racing-cards-2025-topps-f1-turbo-attax

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify you have the latest Chrome and ChromeDriver versions
3. Make sure all dependencies are installed

## License

This scraper is for personal use only. Respect SportsCardsPro's terms of service.
