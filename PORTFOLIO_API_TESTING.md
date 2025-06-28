# Portfolio API Testing Guide

This document provides cURL commands to test all portfolio API endpoints manually.

## Prerequisites

1. Server running on `http://localhost:5000`
2. Valid JWT token for authenticated requests
3. AWS S3 credentials configured in environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_S3_BUCKET_NAME`

## Test Commands

### 1. Get All Portfolios (Public)

```bash
curl -X GET "http://localhost:5000/api/portfolios" \
  -H "Content-Type: application/json"
```

### 2. Get All Portfolios with Filtering

```bash
# Filter by category
curl -X GET "http://localhost:5000/api/portfolios?category=YOLO&sort=hot&page=1&limit=10" \
  -H "Content-Type: application/json"
```

### 3. Get Single Portfolio (Public)

```bash
# Replace PORTFOLIO_ID with actual portfolio ID
curl -X GET "http://localhost:5000/api/portfolios/PORTFOLIO_ID" \
  -H "Content-Type: application/json"
```

### 4. Create Portfolio (Protected - requires authentication)

```bash
# Replace YOUR_JWT_TOKEN with actual token and PATH_TO_IMAGE with image file
curl -X POST "http://localhost:5000/api/portfolios" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@PATH_TO_IMAGE" \
  -F "title=My YOLO Portfolio" \
  -F "description=All in on NVDA calls!" \
  -F "performance=+247% YTD" \
  -F "category=YOLO"
```

### 5. Delete Portfolio (Protected - author only)

```bash
# Replace YOUR_JWT_TOKEN and PORTFOLIO_ID
curl -X DELETE "http://localhost:5000/api/portfolios/PORTFOLIO_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 6. Vote on Portfolio (Optional authentication)

```bash
# Upvote
curl -X POST "http://localhost:5000/api/portfolios/PORTFOLIO_ID/vote" \
  -H "Content-Type: application/json" \
  -d '{"voteType": "upvote"}'

# Downvote
curl -X POST "http://localhost:5000/api/portfolios/PORTFOLIO_ID/vote" \
  -H "Content-Type: application/json" \
  -d '{"voteType": "downvote"}'

# With authentication
curl -X POST "http://localhost:5000/api/portfolios/PORTFOLIO_ID/vote" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"voteType": "upvote"}'
```

### 7. Remove Vote (Optional authentication)

```bash
curl -X DELETE "http://localhost:5000/api/portfolios/PORTFOLIO_ID/vote" \
  -H "Content-Type: application/json"

# With authentication
curl -X DELETE "http://localhost:5000/api/portfolios/PORTFOLIO_ID/vote" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 8. Get Portfolio Comments (Public)

```bash
curl -X GET "http://localhost:5000/api/portfolios/PORTFOLIO_ID/comments" \
  -H "Content-Type: application/json"
```

### 9. Create Portfolio Comment (Optional authentication)

```bash
# Anonymous comment
curl -X POST "http://localhost:5000/api/portfolios/PORTFOLIO_ID/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great portfolio strategy!",
    "portfolioId": "PORTFOLIO_ID",
    "isAnonymous": true
  }'

# Authenticated comment
curl -X POST "http://localhost:5000/api/portfolios/PORTFOLIO_ID/comments" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Impressive gains!",
    "portfolioId": "PORTFOLIO_ID"
  }'

# Reply to comment
curl -X POST "http://localhost:5000/api/portfolios/PORTFOLIO_ID/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I agree with this analysis",
    "portfolioId": "PORTFOLIO_ID",
    "parentCommentId": "PARENT_COMMENT_ID",
    "isAnonymous": true
  }'
```

## Expected HTTP Status Codes

- `200` - Success (GET, DELETE vote)
- `201` - Created (POST portfolio, POST comment, POST vote)
- `400` - Bad Request (invalid data, duplicate vote)
- `401` - Unauthorized (missing auth for protected routes)
- `403` - Forbidden (trying to delete another user's portfolio)
- `404` - Not Found (portfolio/comment doesn't exist)
- `500` - Server Error

## Response Examples

### Successful Portfolio Creation

```json
{
  "success": true,
  "data": {
    "_id": "64a5f7e8c123456789abcdef",
    "title": "My YOLO Portfolio",
    "description": "All in on NVDA calls!",
    "performance": "+247% YTD",
    "category": "YOLO",
    "imageUrl": "https://bucket.s3.region.amazonaws.com/portfolio-123-uuid.jpg",
    "thumbnailUrl": "https://bucket.s3.region.amazonaws.com/portfolio-123-uuid-thumb.jpg",
    "upvotes": 0,
    "downvotes": 0,
    "commentCount": 0,
    "author": {
      "_id": "64a5f7e8c123456789abcde0",
      "username": "trader123"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Portfolio created successfully"
}
```

### Successful Vote

```json
{
  "success": true,
  "message": "Portfolio upvoted successfully",
  "data": {
    "upvotes": 5,
    "downvotes": 1,
    "netVotes": 4,
    "userVote": "upvote"
  }
}
```

## Testing Notes

1. **File Upload**: Use actual image files (JPEG, PNG, GIF) under 5MB
2. **Authentication**: Get JWT token from `/api/auth/login` endpoint first
3. **ObjectId Format**: Use valid MongoDB ObjectIds for testing
4. **Anonymous Testing**: Test without Authorization header for anonymous features
5. **Error Handling**: Test invalid inputs to verify error responses
