/*
    CheckNFTOwnership.cdc - Script to verify if an address owns a specific NBA Top Shot moment
    This enables owner authentication for gated features like MomentsWiki
*/

import "NonFungibleToken"
import "MetadataViews"
import "TopShot" from 0x0b2a3299cc857e29

access(all) struct OwnershipResult {
    access(all) let isOwner: Bool
    access(all) let momentID: UInt64
    access(all) let setID: UInt32
    access(all) let playID: UInt32
    access(all) let serialNumber: UInt32
    
    init(isOwner: Bool, momentID: UInt64, setID: UInt32, playID: UInt32, serialNumber: UInt32) {
        self.isOwner = isOwner
        self.momentID = momentID
        self.setID = setID
        self.playID = playID
        self.serialNumber = serialNumber
    }
}

access(all) fun main(ownerAddress: Address, momentID: UInt64): OwnershipResult {
    // Get the owner's account
    let account = getAccount(ownerAddress)
    
    // Try to borrow the TopShot collection reference
    let collectionRef = account.getCapability<&TopShot.Collection{TopShot.MomentPublic, NonFungibleToken.CollectionPublic}>(
        TopShot.CollectionPublicPath
    ).borrow()
    
    // If collection doesn't exist or moment not owned, return false
    if collectionRef == nil {
        return OwnershipResult(
            isOwner: false,
            momentID: momentID,
            setID: 0,
            playID: 0,
            serialNumber: 0
        )
    }
    
    // Get the NFT from the collection
    let moment = collectionRef!.borrowNFT(id: momentID)
    
    if moment == nil {
        return OwnershipResult(
            isOwner: false,
            momentID: momentID,
            setID: 0,
            playID: 0,
            serialNumber: 0
        )
    }
    
    // Extract moment data
    let data = moment!.data
    
    return OwnershipResult(
        isOwner: true,
        momentID: momentID,
        setID: data.setID,
        playID: data.playID,
        serialNumber: data.serialNumber
    )
}















