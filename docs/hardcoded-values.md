# Hardcoded Values

This file lists values that are currently hardcoded in the codebase.

## API / Config Defaults
- API base URL fallback: http://localhost:3000
- API key fallback: empty string

## Backoffice Auth
- Hardcoded login: admin@gmail.com / admin123

## Frontoffice / Guest Session
- Anonymous customer ID: 1
- Guest display name: Utilisateur anonyme
- Guest email format: guest-{timestamp}-{random}@guest.local
- Guest first/last name defaults: Guest / User
- Customer name fallback: Client {id}

## Cart Defaults
- Currency ID: 1
- Language ID: 1
- Shop group ID: 1
- Shop ID: 1
- Default carrier ID: 1
- Recyclable: 0
- Gift: 0
- Mobile theme: 0
- Allow separated package: 0
- Delivery option format: {"addressId":"carrierId,"} when auto-built
- Cart row defaults: id_product_attribute=0, id_customization=0, quantity=1

## Order Defaults
- Current order state fallback (COD pending): 11
- Order valid flag: 0
- Conversion rate: 1.000000
- Totals defaults: 0.000000 (discounts, shipping, wrapping)
- Fallback product name: Produit {id}
- Fallback product reference: {id}

## Payment Defaults
- Checkout module: ps_cashondelivery
- Checkout label: Paiement comptant a la livraison (Cash on delivery)
- Checkout UI label: Paiement comptant a la livraison
- Import module: ps_checkpayment
- Import payment label: Import

## Customer / Address Defaults
- Default language ID: 1
- Default shop ID: 1
- Default shop group ID: 1
- Default customer group ID: 1
- Default country ID: 8
- Default state ID: 0
- Address alias: Checkout

## Import Defaults
- Category parent ID: 1
- Tax rule default country ID: 8
- Tax rule default state ID: 0
- Tax rule behavior: 0
- Import address default postcode: 101
- Import address default city: Antananarivo
- Import carrier ID: 1
- Import currency ID: 1
- Import language ID: 1

## Stock Movement Defaults
- Default stock movement reason: 6
- Default movement sign: -1
- Default employee ID: 1
- Default warehouse ID: 0
- Default movement currency ID: 0
- Default management type: 0
- Default price_te: 0.000000
- Update stock movement reasons: 2 (entry), 3 (exit)

## Misc
- Order totals: computed from cart items and set into multiple fields
- Customer filters assume active=1 and is_guest=1 flags when filtering lists
