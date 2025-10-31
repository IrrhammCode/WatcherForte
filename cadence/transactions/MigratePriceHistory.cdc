/*
    MigratePriceHistory.cdc - Migration transaction to add priceHistory field
*/

transaction {
    prepare(signer: auth(Account) &Account) {
        // Initialize priceHistory for all existing watchers
        // This will be called after deployment to ensure backward compatibility
    }
}















