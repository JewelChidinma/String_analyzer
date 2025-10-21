# String Analyzer API

A RESTful API service that analyzes strings and stores their computed properties including length, palindrome detection, unique character count, word count, SHA-256 hash, and character frequency mapping.

## Features

- Analyze strings with 6 computed properties
- Persistent JSON file-based storage
- Filter strings with multiple query parameters
- Natural language query parsing
- Full CRUD operations
- Proper HTTP status codes and error handling

## String Properties Computed

For each analyzed string, the API computes:

- **length**: Number of characters in the string
- **is_palindrome**: Boolean indicating if the string reads the same forwards and backwards (case-insensitive)
- **unique_characters**: Count of distinct characters in the string
- **word_count**: Number of words separated by whitespace
- **sha256_hash**: SHA-256 hash of the string for unique identification
- **character_frequency_map**: Object/dictionary mapping each character to its occurrence count

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **File System (fs)** - JSON file-based persistence
- **Crypto** - SHA-256 hashing (built-in)

## Prerequisites

- Node.js v14 or higher
- npm or yarn

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/JewelChidinma/String_analyzer.git
cd String_analyzer
```

2. **Install dependencies:**
```bash
npm install express
```

3. **Create environment variables:**
```bash
echo "PORT=3000"
```

## Running Locally

### Start the server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### 1. Create/Analyze String
**POST** `/strings`

Analyzes a string and stores its properties.

**Request:**
```bash
curl -X POST http://localhost:3000/strings \
  -H "Content-Type: application/json" \
  -d '{"value": "racecar"}'
```

**Response (201 Created):**
```json
{
  "id": "a3c024e3b7e1e5c8d0f4e3e8b7e1e5c8d0f4e3e8b7e1e5c8d0f4e3e8b7e1e5c8",
  "value": "racecar",
  "properties": {
    "length": 7,
    "is_palindrome": true,
    "unique_characters": 4,
    "word_count": 1,
    "sha256_hash": "a3c024e3b7e1e5c8d0f4e3e8b7e1e5c8d0f4e3e8b7e1e5c8d0f4e3e8b7e1e5c8",
    "character_frequency_map": {
      "r": 2,
      "a": 2,
      "c": 2,
      "e": 1
    }
  },
  "created_at": "2025-10-21T12:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing "value" field
- `409 Conflict` - String already exists in the system
- `422 Unprocessable Entity` - Invalid data type for "value" (must be string)

---

### 2. Get Specific String
**GET** `/strings/:string_value`

Retrieves a previously analyzed string.

**Request:**
```bash
curl http://localhost:3000/strings/racecar
```

**Response (200 OK):**
```json
{
  "id": "a3c024e3b7e1e5c8d0f4e3e8b7e1e5c8d0f4e3e8b7e1e5c8d0f4e3e8b7e1e5c8",
  "value": "racecar",
  "properties": { ... },
  "created_at": "2025-10-21T12:00:00.000Z"
}
```

**Error Response:**
- `404 Not Found` - String does not exist in the system

---

### 3. Get All Strings with Filtering
**GET** `/strings`

Retrieves all strings with optional filters.

**Query Parameters:**
- `is_palindrome` - Filter by palindrome status (true/false)
- `min_length` - Minimum string length (integer)
- `max_length` - Maximum string length (integer)
- `word_count` - Exact word count (integer)
- `contains_character` - Single character to search for

**Examples:**
```bash
# Get all palindromes
curl "http://localhost:3000/strings?is_palindrome=true"

# Get strings with length between 5 and 10
curl "http://localhost:3000/strings?min_length=5&max_length=10"

# Get single-word strings containing 'a'
curl "http://localhost:3000/strings?word_count=1&contains_character=a"

# Combine multiple filters
curl "http://localhost:3000/strings?is_palindrome=true&min_length=5&word_count=1"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "...",
      "value": "racecar",
      "properties": { ... },
      "created_at": "2025-10-21T12:00:00.000Z"
    }
  ],
  "count": 1,
  "filters_applied": {
    "is_palindrome": true,
    "min_length": 5,
    "word_count": 1
  }
}
```

**Error Response:**
- `400 Bad Request` - Invalid query parameter values or types

---

### 4. Natural Language Filtering
**GET** `/strings/filter-by-natural-language?query=<your_query>`

Filters strings using natural language queries.

**Supported Query Patterns:**
- `"all single word palindromic strings"` → word_count=1, is_palindrome=true
- `"strings longer than 10 characters"` → min_length=11
- `"strings containing the letter z"` → contains_character=z
- `"palindromic strings that contain the first vowel"` → is_palindrome=true, contains_character=a
- `"strings shorter than 5 characters"` → max_length=4

**Examples:**
```bash
# Find single-word palindromes
curl "http://localhost:3000/strings/filter-by-natural-language?query=single%20word%20palindromic%20strings"

# Find long strings
curl "http://localhost:3000/strings/filter-by-natural-language?query=strings%20longer%20than%2010%20characters"

# Find strings with specific character
curl "http://localhost:3000/strings/filter-by-natural-language?query=strings%20containing%20the%20letter%20z"
```

**Response (200 OK):**
```json
{
  "data": [ ... ],
  "count": 3,
  "interpreted_query": {
    "original": "single word palindromic strings",
    "parsed_filters": {
      "word_count": 1,
      "is_palindrome": true
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Unable to parse natural language query
- `422 Unprocessable Entity` - Query parsed but resulted in conflicting filters

---

### 5. Delete String
**DELETE** `/strings/:string_value`

Deletes a string from the system.

**Request:**
```bash
curl -X DELETE http://localhost:3000/strings/racecar
```

**Response:**
- `204 No Content` - Successfully deleted (empty response body)

**Error Response:**
- `404 Not Found` - String does not exist in the system

---


## API Status Codes

200 OK - Successful GET requests
201 Created - Successful POST (string created)
204 No Content - Successful DELETE
400 Bad Request - Invalid request format or missing required fields
404 Not Found - Resource doesn't exist
409 Conflict - Duplicate string
422 Unprocessable Entity - Invalid data type or conflicting filters
500 Internal Server Error - Server-side error

## Key Implementation Details

### Palindrome Detection
- Case-insensitive comparison
- Example: "RaceCar" returns `true`

### Word Count
- Words separated by whitespace (`\s+`)
- Empty strings return `word_count: 0`

### Character Frequency
- Counts ALL characters including spaces and special characters
- Example: "hello" → `{"h":1, "e":1, "l":2, "o":1}`

### Natural Language Parsing
Supports patterns like:
- "single word" / "1 word" → `word_count: 1`
- "longer than X" → `min_length: X+1`
- "shorter than X" → `max_length: X-1`
- "palindromic" → `is_palindrome: true`
- "containing letter X" → `contains_character: X`
- "first vowel" → `contains_character: a`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Author

**Your Name**
- GitHub: Jewel Chidinma (https://github.com/JewelChidinma)
- Email: jewelchidinma@gmail.com


**Live API URL:** stringanalyzer-production-9177.up.railway.app

**Last Updated:** October 21, 2025

