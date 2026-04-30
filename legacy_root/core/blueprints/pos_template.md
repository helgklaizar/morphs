# Blueprint: Local Offline Point of Sale (POS)

## Description
A template for a business. A POS terminal for a cafe or retail.

## Basic Features (What to include in the technical specification for the developer/architect):
1. Shopping cart (local state, saved in SQLite/IndexedDB in case of network interruption).
2. Checkout (calculate total + taxes).
3. PIN code entry screen (cashier) or table selection.
4. Synchronization: Orders are sent to the server only when an internet connection is available.
