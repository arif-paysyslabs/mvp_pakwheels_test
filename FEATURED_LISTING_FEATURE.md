# Featured Listing Functionality - Feature Request

## Overview
Add a "Featured Listing" functionality that allows users to pay to have their vehicle listings prominently displayed on the platform.

## Problem Statement
Currently, all vehicle listings are treated equally in terms of visibility. Users who want more exposure for their listings have no way to pay for premium placement.

## Requirements

### 1. Database Changes
- Add a `is_featured` boolean field to the listings/vehicles table
- Add a `featured_until` datetime field to track when the featured status expires
- Add a `featured_payment_id` field to link to payment records

### 2. Listing Creation/Edit Form
- Add a checkbox labeled "Mark as Featured Listing" on the listing creation form
- When checked, show a note: "Featured listings require payment. You'll be redirected to payment after submitting."
- The checkbox should be disabled for users who haven't paid for featured status

### 3. Featured Listing Display
- Featured listings should appear at the top of search results
- Add a "Featured" badge/ribbon on listing cards
- Featured listings should have priority in category pages
- Consider highlighting featured listings with a different border or background

### 4. Admin Panel
- Ability to manually mark listings as featured (for promotions/testing)
- View all featured listings with their expiration dates
- Filter listings by featured status

### 5. Validation Rules
- A listing can only be featured if:
  - User has paid for featured status
  - Listing is active (not sold/removed)
  - Featured period hasn't expired
- Maximum featured duration: 30 days per payment
- Users can renew featured status before expiration

## Technical Implementation

### Backend Changes
1. **Models/Database**:
   ```javascript
   // Example schema changes
   const ListingSchema = new Schema({
     // ... existing fields
     isFeatured: { type: Boolean, default: false },
     featuredUntil: { type: Date },
     featuredPaymentId: { type: String }
   });
   ```

2. **API Endpoints**:
   - `POST /api/listings/:id/feature` - Mark listing as featured (requires payment)
   - `GET /api/listings/featured` - Get all featured listings
   - `PUT /api/listings/:id/feature/status` - Update featured status (admin only)

3. **Middleware**:
   - Add featured listing filter to listing queries
   - Sort featured listings first in search results

### Frontend Changes
1. **Listing Form**:
   - Add checkbox component for featured option
   - Show payment modal/redirect when featured is selected
   - Disable checkbox if user hasn't completed payment

2. **Listing Card Component**:
   - Add "Featured" badge component
   - Conditional styling for featured listings

3. **Search/Sort**:
   - Default sort: Featured listings first, then by date
   - Add "Show Featured Only" filter option

## Dependencies
- Payment system integration (see separate issue: PAYMENT_INTEGRATION.md)
- User authentication/authorization system
- Email notification system for expiration reminders

## Acceptance Criteria
- [ ] Users can select "Featured" option when creating a listing
- [ ] Featured listings appear at top of search results
- [ ] Featured listings have visual distinction
- [ ] Admin can manage featured listings
- [ ] Featured status expires automatically
- [ ] Users receive notifications before expiration

## Future Enhancements
1. Tiered featured listings (Gold, Silver, Bronze)
2. Featured listings in email newsletters
3. Featured listings on homepage carousel
4. Analytics for featured listing performance
5. Bulk featured listing purchases for dealers

## Related Issues
- Payment Integration System
- Notification System for Expiring Featured Listings
- Admin Dashboard Enhancements

## Priority: High
## Estimated Effort: 2-3 weeks
## Assigned To: TBD