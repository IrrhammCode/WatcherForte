import WatcherRegistry from 0x7ca8cd62e27bad20

access(all) fun main(owner: Address): [UInt64] {
    return WatcherRegistry.getWatchersByOwner(owner: owner)
}

