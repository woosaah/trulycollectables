# TrulyCollectables REST API Documentation

## Overview

The TrulyCollectables REST API provides programmatic access to manage cards, accessories, sets, and orders. All API endpoints require authentication using HTTP Basic Auth.

**Base URL:** `https://your-domain.com/api/v1`

**Version:** 1.0.0

## Authentication

The API uses HTTP Basic Authentication with username and API key credentials.

### Getting Your API Key

1. Admin users have API access enabled by default
2. Log into the admin dashboard at `/admin/users`
3. Click "Generate API Key" for your user account
4. **Important:** Save the API key immediately - you won't be able to see it again!

### Making Authenticated Requests

Include your credentials in the Authorization header:

```bash
curl -u username:api_key https://your-domain.com/api/v1/cards
```

Or using the header directly:

```bash
# Base64 encode "username:api_key"
curl -H "Authorization: Basic dXNlcm5hbWU6YXBpX2tleQ==" \
  https://your-domain.com/api/v1/cards
```

### Authentication Errors

- `401 Unauthorized` - Invalid or missing credentials
- `403 Forbidden` - Valid credentials but insufficient permissions (admin required)

## Rate Limiting

Currently, there are no rate limits enforced. This may change in future versions.

## Response Format

All responses are in JSON format.

### Success Response
```json
{
  "cards": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

## HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Cards API

### Get All Cards

Retrieve a paginated list of cards.

**Endpoint:** `GET /api/v1/cards`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page (max 100) |
| search | string | - | Search card name |
| sport_type | string | - | Filter by sport type |
| manufacturer | string | - | Filter by manufacturer |
| year | integer | - | Filter by year |
| condition | string | - | Filter by condition |

**Example Request:**

```bash
curl -u username:api_key \
  "https://your-domain.com/api/v1/cards?page=1&limit=20&sport_type=basketball"
```

**Example Response:**

```json
{
  "cards": [
    {
      "id": 1,
      "card_name": "Michael Jordan Rookie",
      "set_name": "1986-87 Fleer",
      "card_number": "#57",
      "manufacturer": "Fleer",
      "year": 1986,
      "sport_type": "basketball",
      "condition": "near_mint",
      "price_nzd": "15000.00",
      "quantity": 1,
      "available": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Get Card by ID

Retrieve details of a specific card.

**Endpoint:** `GET /api/v1/cards/:id`

**Authentication:** Required

**Example Request:**

```bash
curl -u username:api_key \
  https://your-domain.com/api/v1/cards/123
```

**Example Response:**

```json
{
  "card": {
    "id": 123,
    "card_name": "Michael Jordan Rookie",
    "set_name": "1986-87 Fleer",
    "card_number": "#57",
    "manufacturer": "Fleer",
    "insert_list": "Base Set",
    "year": 1986,
    "card_category": "sport",
    "sport_type": "basketball",
    "condition": "near_mint",
    "price_nzd": "15000.00",
    "quantity": 1,
    "image_front": "/uploads/card-front.jpg",
    "image_back": "/uploads/card-back.jpg",
    "description": "Iconic rookie card",
    "available": true,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Create Card

Create a new card in the inventory.

**Endpoint:** `POST /api/v1/cards`

**Authentication:** Required (Admin only)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| card_name | string | Yes | Card name |
| price_nzd | decimal | Yes | Price in NZD |
| set_name | string | No | Set name |
| card_number | string | No | Card number |
| manufacturer | string | No | Manufacturer |
| insert_list | string | No | Insert/subset |
| year | integer | No | Year |
| card_category | string | No | sport/non_sport |
| sport_type | string | No | Sport type |
| condition | string | No | Condition |
| quantity | integer | No | Quantity (default: 1) |
| image_front | string | No | Front image URL |
| image_back | string | No | Back image URL |
| description | text | No | Description |
| available | boolean | No | Availability (default: true) |

**Example Request:**

```bash
curl -u username:api_key \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "card_name": "LeBron James RC",
    "set_name": "2003-04 Topps Chrome",
    "card_number": "#111",
    "manufacturer": "Topps",
    "year": 2003,
    "sport_type": "basketball",
    "condition": "mint",
    "price_nzd": 5000.00,
    "quantity": 1
  }' \
  https://your-domain.com/api/v1/cards
```

**Example Response:**

```json
{
  "card": {
    "id": 456,
    "card_name": "LeBron James RC",
    "set_name": "2003-04 Topps Chrome",
    "price_nzd": "5000.00",
    "available": true,
    "created_at": "2024-01-20T15:45:00.000Z"
  }
}
```

### Update Card

Update an existing card.

**Endpoint:** `PUT /api/v1/cards/:id`

**Authentication:** Required (Admin only)

**Request Body:** Same fields as Create Card (all optional)

**Example Request:**

```bash
curl -u username:api_key \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{
    "price_nzd": 5500.00,
    "quantity": 2
  }' \
  https://your-domain.com/api/v1/cards/456
```

### Delete Card

Delete a card from inventory.

**Endpoint:** `DELETE /api/v1/cards/:id`

**Authentication:** Required (Admin only)

**Example Request:**

```bash
curl -u username:api_key \
  -X DELETE \
  https://your-domain.com/api/v1/cards/456
```

**Example Response:**

```json
{
  "message": "Card deleted successfully"
}
```

---

## Orders API

### Get All Orders

Retrieve all orders (admin only).

**Endpoint:** `GET /api/v1/orders`

**Authentication:** Required (Admin only)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (pending/processing/shipped/delivered/cancelled) |
| search | string | Search by order number or email |

**Example Request:**

```bash
curl -u username:api_key \
  "https://your-domain.com/api/v1/orders?status=pending"
```

**Example Response:**

```json
{
  "orders": [
    {
      "id": 1,
      "order_number": "ORD-20240115-001",
      "customer_email": "customer@example.com",
      "total_nzd": "250.00",
      "status": "pending",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

### Get Order by ID

Retrieve details of a specific order including items.

**Endpoint:** `GET /api/v1/orders/:id`

**Authentication:** Required (Admin only)

**Example Request:**

```bash
curl -u username:api_key \
  https://your-domain.com/api/v1/orders/1
```

**Example Response:**

```json
{
  "order": {
    "id": 1,
    "order_number": "ORD-20240115-001",
    "customer_email": "customer@example.com",
    "total_nzd": "250.00",
    "status": "pending",
    "created_at": "2024-01-15T10:00:00.000Z",
    "items": [
      {
        "id": 1,
        "card_name": "Card Name",
        "quantity": 2,
        "price_nzd": "125.00"
      }
    ]
  }
}
```

### Update Order Status

Update the status of an order.

**Endpoint:** `PUT /api/v1/orders/:id/status`

**Authentication:** Required (Admin only)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | pending/processing/shipped/delivered/cancelled |

**Example Request:**

```bash
curl -u username:api_key \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}' \
  https://your-domain.com/api/v1/orders/1/status
```

---

## Accessories API

### Get All Accessories

Retrieve a paginated list of accessories.

**Endpoint:** `GET /api/v1/accessories`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page (max 100) |
| search | string | - | Search term |
| category | string | - | Filter by category |

**Example Request:**

```bash
curl -u username:api_key \
  "https://your-domain.com/api/v1/accessories?category=sleeves"
```

### Get Accessory by ID

**Endpoint:** `GET /api/v1/accessories/:id`

**Authentication:** Required

### Create Accessory

**Endpoint:** `POST /api/v1/accessories`

**Authentication:** Required (Admin only)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| product_name | string | Yes | Product name |
| price_nzd | decimal | Yes | Price in NZD |
| category | string | No | Category |
| description | text | No | Description |
| quantity | integer | No | Quantity (default: 0) |
| manufacturer | string | No | Manufacturer |
| image_url | string | No | Image URL |

**Example Request:**

```bash
curl -u username:api_key \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Ultra Pro Card Sleeves",
    "category": "sleeves",
    "price_nzd": 15.99,
    "quantity": 100
  }' \
  https://your-domain.com/api/v1/accessories
```

### Update Accessory

**Endpoint:** `PUT /api/v1/accessories/:id`

**Authentication:** Required (Admin only)

### Delete Accessory

**Endpoint:** `DELETE /api/v1/accessories/:id`

**Authentication:** Required (Admin only)

---

## Sets API

### Get All Sets

Retrieve a paginated list of card sets.

**Endpoint:** `GET /api/v1/sets`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page (max 100) |
| search | string | - | Search term |
| sport_type | string | - | Filter by sport type |
| manufacturer | string | - | Filter by manufacturer |

**Example Request:**

```bash
curl -u username:api_key \
  "https://your-domain.com/api/v1/sets?manufacturer=Topps"
```

### Get Set by ID

**Endpoint:** `GET /api/v1/sets/:id`

**Authentication:** Required

### Create Set

**Endpoint:** `POST /api/v1/sets`

**Authentication:** Required (Admin only)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| set_name | string | Yes | Set name |
| manufacturer | string | No | Manufacturer |
| year | integer | No | Year |
| sport_type | string | No | Sport type |
| card_category | string | No | Card category |
| description | text | No | Description |
| image_url | string | No | Image URL |

**Example Request:**

```bash
curl -u username:api_key \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "set_name": "2023 Topps Series 1",
    "manufacturer": "Topps",
    "year": 2023,
    "sport_type": "baseball"
  }' \
  https://your-domain.com/api/v1/sets
```

### Update Set

**Endpoint:** `PUT /api/v1/sets/:id`

**Authentication:** Required (Admin only)

### Delete Set

**Endpoint:** `DELETE /api/v1/sets/:id`

**Authentication:** Required (Admin only)

---

## Common Use Cases

### Example: Get All Basketball Cards

```bash
curl -u username:api_key \
  "https://your-domain.com/api/v1/cards?sport_type=basketball&limit=100"
```

### Example: Update Card Price

```bash
curl -u username:api_key \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"price_nzd": 299.99}' \
  https://your-domain.com/api/v1/cards/123
```

### Example: Search for Cards

```bash
curl -u username:api_key \
  "https://your-domain.com/api/v1/cards?search=jordan&sport_type=basketball"
```

### Example: Process Order Status Update

```bash
curl -u username:api_key \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}' \
  https://your-domain.com/api/v1/orders/456/status
```

---

## Code Examples

### Python

```python
import requests
from requests.auth import HTTPBasicAuth

# Configuration
BASE_URL = "https://your-domain.com/api/v1"
USERNAME = "your_username"
API_KEY = "your_api_key"

# Get all cards
response = requests.get(
    f"{BASE_URL}/cards",
    auth=HTTPBasicAuth(USERNAME, API_KEY),
    params={"sport_type": "basketball", "limit": 20}
)

cards = response.json()
print(cards)

# Create a new card
new_card = {
    "card_name": "Kobe Bryant RC",
    "set_name": "1996-97 Topps Chrome",
    "price_nzd": 8000.00,
    "sport_type": "basketball",
    "condition": "mint"
}

response = requests.post(
    f"{BASE_URL}/cards",
    auth=HTTPBasicAuth(USERNAME, API_KEY),
    json=new_card
)

created_card = response.json()
print(created_card)
```

### JavaScript (Node.js)

```javascript
const axios = require('axios');

const BASE_URL = 'https://your-domain.com/api/v1';
const USERNAME = 'your_username';
const API_KEY = 'your_api_key';

// Get all cards
async function getCards() {
  try {
    const response = await axios.get(`${BASE_URL}/cards`, {
      auth: {
        username: USERNAME,
        password: API_KEY
      },
      params: {
        sport_type: 'basketball',
        limit: 20
      }
    });

    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Create a new card
async function createCard() {
  try {
    const response = await axios.post(
      `${BASE_URL}/cards`,
      {
        card_name: 'Kobe Bryant RC',
        set_name: '1996-97 Topps Chrome',
        price_nzd: 8000.00,
        sport_type: 'basketball',
        condition: 'mint'
      },
      {
        auth: {
          username: USERNAME,
          password: API_KEY
        }
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

getCards();
```

### PHP

```php
<?php

$base_url = 'https://your-domain.com/api/v1';
$username = 'your_username';
$api_key = 'your_api_key';

// Get all cards
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$base_url/cards?sport_type=basketball&limit=20");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, "$username:$api_key");
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);

$response = curl_exec($ch);
$cards = json_decode($response, true);
curl_close($ch);

print_r($cards);

// Create a new card
$new_card = [
    'card_name' => 'Kobe Bryant RC',
    'set_name' => '1996-97 Topps Chrome',
    'price_nzd' => 8000.00,
    'sport_type' => 'basketball',
    'condition' => 'mint'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$base_url/cards");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($new_card));
curl_setopt($ch, CURLOPT_USERPWD, "$username:$api_key");
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$created_card = json_decode($response, true);
curl_close($ch);

print_r($created_card);
?>
```

---

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables** to store credentials
3. **Always use HTTPS** in production
4. **Rotate API keys regularly**
5. **Revoke API access** for unused or compromised keys
6. **Monitor API usage** for unusual activity
7. **Use separate API keys** for different applications or environments

---

## Support

For questions or issues with the API, please contact:
- Email: admin@trulycollectables.co.nz
- Admin Dashboard: https://your-domain.com/admin

---

## Changelog

### Version 1.0.0 (2024-01-20)
- Initial API release
- Cards, Orders, Accessories, and Sets endpoints
- HTTP Basic Authentication
- Pagination support
