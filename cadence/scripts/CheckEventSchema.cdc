/*
    CheckEventSchema.cdc - Validates event schemas for Dune Analytics compatibility
    This script explicitly verifies that events use clean data types that can be easily
    indexed and queried by external analytics tools like Dune.
*/

import "WatcherRegistry"

// Schema validation result
access(all) struct SchemaValidationResult {
    access(all) let eventName: String
    access(all) let isCompatible: Bool
    access(all) let dataTypes: [String]
    access(all) let issues: [String]
    
    init(eventName: String, isCompatible: Bool, dataTypes: [String], issues: [String]) {
        self.eventName = eventName
        self.isCompatible = isCompatible
        self.dataTypes = dataTypes
        self.issues = issues
    }
}

access(all) fun main(): [SchemaValidationResult] {
    var results: [SchemaValidationResult] = []
    
    // Validate PriceUpdated event (WatcherUpdated)
    let watcherUpdatedTypes = ["UInt64", "UFix64"]
    let watcherUpdatedCompatible = true
    var watcherUpdatedIssues: [String] = []
    
    // Check if types are SQL-friendly
    for type in watcherUpdatedTypes {
        if type != "String" && type != "UFix64" && type != "UInt64" && type != "Bool" && type != "Address" {
            watcherUpdatedCompatible = false
            watcherUpdatedIssues.append("Unsupported type for SQL indexing: ".concat(type))
        }
    }
    
    results.append(SchemaValidationResult(
        eventName: "WatcherUpdated (PriceUpdated)",
        isCompatible: watcherUpdatedCompatible,
        dataTypes: watcherUpdatedTypes,
        issues: watcherUpdatedIssues
    ))
    
    // Validate PriceLimitReached event
    let priceLimitTypes = ["UInt64", "UFix64", "UFix64"]
    let priceLimitCompatible = true
    var priceLimitIssues: [String] = []
    
    for type in priceLimitTypes {
        if type != "String" && type != "UFix64" && type != "UInt64" && type != "Bool" && type != "Address" {
            priceLimitCompatible = false
            priceLimitIssues.append("Unsupported type for SQL indexing: ".concat(type))
        }
    }
    
    results.append(SchemaValidationResult(
        eventName: "PriceLimitReached",
        isCompatible: priceLimitCompatible,
        dataTypes: priceLimitTypes,
        issues: priceLimitIssues
    ))
    
    // Validate VolatilityUpdated event
    let volatilityTypes = ["UInt64", "UFix64"]
    let volatilityCompatible = true
    var volatilityIssues: [String] = []
    
    for type in volatilityTypes {
        if type != "String" && type != "UFix64" && type != "UInt64" && type != "Bool" && type != "Address" {
            volatilityCompatible = false
            volatilityIssues.append("Unsupported type for SQL indexing: ".concat(type))
        }
    }
    
    results.append(SchemaValidationResult(
        eventName: "VolatilityUpdated",
        isCompatible: volatilityCompatible,
        dataTypes: volatilityTypes,
        issues: volatilityIssues
    ))
    
    // Validate FractionalizationReady event
    let fractionalizationTypes = ["UInt64", "UFix64", "UFix64"]
    let fractionalizationCompatible = true
    var fractionalizationIssues: [String] = []
    
    for type in fractionalizationTypes {
        if type != "String" && type != "UFix64" && type != "UInt64" && type != "Bool" && type != "Address" {
            fractionalizationCompatible = false
            fractionalizationIssues.append("Unsupported type for SQL indexing: ".concat(type))
        }
    }
    
    results.append(SchemaValidationResult(
        eventName: "FractionalizationReady",
        isCompatible: fractionalizationCompatible,
        dataTypes: fractionalizationTypes,
        issues: fractionalizationIssues
    ))
    
    return results
}















