# Quick Start Guide: Business Finance Tracker

**Purpose**: Step-by-step validation of core functionality
**Target**: Complete user journey from signup to financial insights

## Prerequisites

### Environment Setup
- Node.js 18+ installed
- PostgreSQL database running
- OpenAI API key configured
- Application server running on localhost:3000

### Test Data
- Valid email address for testing
- Test business information
- Sample transaction descriptions

## Quick Start Scenarios

### Scenario 1: User Registration & First Transaction

**Objective**: Validate complete user onboarding and first transaction recording

#### Step 1: User Registration
```bash
# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@business.com",
    "password": "SecurePass123!",
    "name": "Test Business Owner",
    "businessName": "Test Company",
    "baseCurrency": "USD"
  }'
```

**Expected Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "test@business.com",
    "name": "Test Business Owner",
    "businessName": "Test Company",
    "baseCurrency": "USD",
    "timezone": "UTC",
    "createdAt": "2025-10-03T10:00:00Z"
  },
  "session": "session_token_here"
}
```

#### Step 2: Default Categories Verification
```bash
# Verify default categories are created
curl -X GET http://localhost:3000/api/categories \
  -H "Authorization: Bearer {session_token}"
```

**Expected Response**: Array of default expense, income, and asset categories

#### Step 3: First AI-Powered Transaction
```bash
# Create transaction with AI categorization
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Bought office supplies from Staples for $45.67 including notebooks and pens",
    "amount": 4567,
    "date": "2025-10-02"
  }'
```

**Expected Response**:
```json
{
  "id": "transaction_uuid",
  "description": "Bought office supplies from Staples for $45.67 including notebooks and pens",
  "processedDescription": "Office supplies purchase at Staples",
  "amount": 4567,
  "currency": "USD",
  "categoryId": "office_supplies_category_id",
  "confidence": 95,
  "needsReview": false,
  "metadata": {
    "vendor": "Staples",
    "tags": ["office", "supplies", "stationery"],
    "aiProcessed": true
  },
  "date": "2025-10-02",
  "type": "expense"
}
```

### Scenario 2: Dashboard Overview & Insights

**Objective**: Validate financial dashboard displays accurate data and AI insights

#### Step 1: Add Multiple Transactions
```bash
# Add multiple transactions for meaningful data
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Client payment for consulting services",
    "amount": 500000,
    "date": "2025-10-01",
    "type": "income"
  }'

curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Monthly software subscription",
    "amount": 9900,
    "date": "2025-10-01",
    "type": "expense"
  }'
```

#### Step 2: Generate AI Insights
```bash
# Request AI insights
curl -X POST http://localhost:3000/api/ai/generate-insights \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "timePeriod": {
      "startDate": "2025-10-01",
      "endDate": "2025-10-03"
    },
    "focusAreas": ["spending_trends", "anomalies", "recommendations"]
  }'
```

**Expected Response**: Array of insights including:
- Spending trend analysis
- Anomaly detection (if any)
- Cost-saving recommendations

#### Step 3: Dashboard Overview
```bash
# Get dashboard data
curl -X GET "http://localhost:3000/api/dashboard/overview?period=30d" \
  -H "Authorization: Bearer {session_token}"
```

**Expected Response**:
```json
{
  "summary": {
    "totalIncome": 500000,
    "totalExpenses": 14467,
    "netIncome": 485533,
    "transactionCount": 3,
    "averageTransaction": 166844
  },
  "trends": {
    "incomeTrend": [...],
    "expenseTrend": [...]
  },
  "categories": [
    {
      "categoryId": "uuid",
      "categoryName": "Office Supplies",
      "amount": 4567,
      "percentage": 31.6,
      "transactionCount": 1
    }
  ],
  "recentInsights": [...]
}
```

### Scenario 3: Transaction Management & Export

**Objective**: Validate transaction editing, categorization, and data export

#### Step 1: Transaction Editing
```bash
# Update transaction category
curl -X PUT http://localhost:3000/api/transactions/{transaction_id} \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "different_category_id",
    "metadata": {
      "notes": "Updated category for better tracking"
    }
  }'
```

#### Step 2: Advanced AI Processing
```bash
# Test complex transaction description
curl -X POST http://localhost:3000/api/ai/process-transaction \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Team lunch at Italian restaurant for project celebration, $125.50 including tip",
    "amount": 12550,
    "currency": "USD",
    "context": {
      "userCategories": ["office_supplies", "meals_entertainment", "client_expenses"]
    }
  }'
```

**Expected Response**: Detailed categorization with confidence scores and alternative suggestions

#### Step 3: Data Export
```bash
# Export transactions as CSV
curl -X POST http://localhost:3000/api/export/transactions \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {
      "startDate": "2025-10-01",
      "endDate": "2025-10-03"
    },
    "includeMetadata": true
  }' \
  --output transactions_export.csv
```

**Validation**: Check CSV file contains:
- All transaction fields
- Proper formatting
- Accurate calculations
- Metadata if requested

## Success Criteria

### Functional Requirements
✅ **User Registration**: Account creation with default categories
✅ **AI Transaction Processing**: Natural language parsing and categorization
✅ **Financial Dashboard**: Accurate summaries and visualizations
✅ **Data Management**: Transaction editing and organization
✅ **Export Functionality**: Multiple format support with filtering

### Performance Requirements
✅ **Response Times**: API responses <500ms for most operations
✅ **AI Processing**: Transaction categorization <2 seconds
✅ **Dashboard Loading**: Full dashboard <2 seconds
✅ **Data Export**: Large dataset processing <30 seconds

### Security Requirements
✅ **Authentication**: Secure session management
✅ **Data Privacy**: User data isolation
✅ **Input Validation**: Proper sanitization and validation
✅ **Rate Limiting**: AI endpoint protection

### Data Accuracy Requirements
✅ **Financial Calculations**: Accurate sums and percentages
✅ **Currency Handling**: Proper conversion and formatting
✅ **Date Processing**: Consistent timezone handling
✅ **Categorization**: High-confidence AI suggestions

## Troubleshooting Guide

### Common Issues

#### 1. AI Categorization Fails
**Symptoms**: Low confidence scores or incorrect categories
**Debugging**:
```bash
# Check AI service status
curl -X GET http://localhost:3000/api/ai/health

# Test with simple description
curl -X POST http://localhost:3000/api/ai/process-transaction \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Office supplies",
    "amount": 5000
  }'
```

#### 2. Dashboard Data Inconsistency
**Symptoms**: Incorrect totals or missing transactions
**Debugging**:
```bash
# Verify transaction counts
curl -X GET "http://localhost:3000/api/transactions?limit=100" \
  -H "Authorization: Bearer {session_token}"

# Check individual transaction amounts
curl -X GET http://localhost:3000/api/transactions/{transaction_id} \
  -H "Authorization: Bearer {session_token}"
```

#### 3. Export Failures
**Symptoms**: Empty or corrupted export files
**Debugging**:
```bash
# Test with smaller date range
curl -X POST http://localhost:3000/api/export/transactions \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "filters": {
      "startDate": "2025-10-02",
      "endDate": "2025-10-02"
    }
  }'
```

### Performance Issues

#### Slow AI Processing
- Check OpenAI API rate limits
- Verify caching mechanisms
- Monitor response times

#### Dashboard Loading Delays
- Check database query performance
- Verify data aggregation efficiency
- Monitor concurrent user limits

## Validation Checklist

### Pre-Launch Validation
- [ ] All scenarios complete successfully
- [ ] Performance benchmarks met
- [ ] Security scans pass
- [ ] Data accuracy verified
- [ ] Error handling tested
- [ ] Cross-browser compatibility confirmed
- [ ] Mobile responsiveness verified

### Post-Launch Monitoring
- [ ] API response times monitored
- [ ] AI service availability tracked
- [ ] User feedback collected
- [ ] Error rates monitored
- [ ] Data backup procedures verified

## Next Steps

### Additional Testing
- Load testing with concurrent users
- Security penetration testing
- Accessibility compliance testing
- Multi-currency transaction testing

### Feature Expansion
- Recurring transaction support
- Advanced reporting features
- Team collaboration tools
- Integration with accounting software

## Support

For issues during quick start testing:
1. Check application logs
2. Verify database connectivity
3. Validate API key configuration
4. Review error responses for debugging information

This quick start guide provides comprehensive validation of core functionality while maintaining focus on user experience and data accuracy.