module onramp_addr::PriceOracle {
    use std::signer;
    use std::string::{Self, String};
    use std::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_PRICE: u64 = 2;
    const E_PRICE_TOO_OLD: u64 = 3;
    const E_NOT_INITIALIZED: u64 = 4;

    /// Price data structure
    struct PriceData has store, drop, copy {
        price: u64,        // Price in smallest unit (e.g., wei, satoshi)
        decimals: u8,      // Number of decimal places
        last_updated: u64, // Timestamp
        confidence: u64,   // Confidence level (0-100)
    }

    /// Oracle configuration
    struct OracleConfig has key {
        admin: address,
        price_feeds: Table<String, PriceData>, // symbol -> price data
        authorized_updaters: Table<address, bool>,
        max_price_age: u64, // Maximum age in microseconds
        min_confidence: u64, // Minimum confidence level
    }

    /// Price update event
    struct PriceUpdateEvent has store, drop {
        symbol: String,
        old_price: u64,
        new_price: u64,
        timestamp: u64,
        updater: address,
    }

    /// Events
    struct OracleEvents has key {
        price_update_events: EventHandle<PriceUpdateEvent>,
    }

    /// Initialize the price oracle
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        assert!(!exists<OracleConfig>(admin_addr), E_NOT_AUTHORIZED);

        let price_feeds = table::new<String, PriceData>();
        let authorized_updaters = table::new<address, bool>();
        
        // Add admin as authorized updater
        table::add(&mut authorized_updaters, admin_addr, true);

        // Initialize with default prices (in INR, with 2 decimals)
        table::add(&mut price_feeds, string::utf8(b"APT"), PriceData {
            price: 1000, // 10.00 INR
            decimals: 2,
            last_updated: timestamp::now_microseconds(),
            confidence: 100,
        });

        table::add(&mut price_feeds, string::utf8(b"USDC"), PriceData {
            price: 8400, // 84.00 INR
            decimals: 2,
            last_updated: timestamp::now_microseconds(),
            confidence: 100,
        });

        table::add(&mut price_feeds, string::utf8(b"BTC"), PriceData {
            price: 740000000, // 7,400,000.00 INR
            decimals: 2,
            last_updated: timestamp::now_microseconds(),
            confidence: 100,
        });

        table::add(&mut price_feeds, string::utf8(b"ETH"), PriceData {
            price: 27000000, // 270,000.00 INR
            decimals: 2,
            last_updated: timestamp::now_microseconds(),
            confidence: 100,
        });

        move_to(admin, OracleConfig {
            admin: admin_addr,
            price_feeds,
            authorized_updaters,
            max_price_age: 3600000000, // 1 hour in microseconds
            min_confidence: 80,
        });

        move_to(admin, OracleEvents {
            price_update_events: account::new_event_handle<PriceUpdateEvent>(admin),
        });
    }

    /// Update price (authorized updaters only)
    public entry fun update_price(
        updater: &signer,
        symbol: String,
        price: u64,
        confidence: u64,
    ) acquires OracleConfig, OracleEvents {
        let updater_addr = signer::address_of(updater);
        let config = borrow_global_mut<OracleConfig>(@onramp_addr);
        let events = borrow_global_mut<OracleEvents>(@onramp_addr);

        // Check authorization
        assert!(
            table::contains(&config.authorized_updaters, updater_addr) &&
            *table::borrow(&config.authorized_updaters, updater_addr),
            E_NOT_AUTHORIZED
        );

        assert!(price > 0, E_INVALID_PRICE);
        assert!(confidence >= config.min_confidence, E_INVALID_PRICE);

        let old_price = if (table::contains(&config.price_feeds, symbol)) {
            table::borrow(&config.price_feeds, symbol).price
        } else {
            0
        };

        let new_price_data = PriceData {
            price,
            decimals: 2, // Default to 2 decimals for INR
            last_updated: timestamp::now_microseconds(),
            confidence,
        };

        if (table::contains(&config.price_feeds, symbol)) {
            *table::borrow_mut(&mut config.price_feeds, symbol) = new_price_data;
        } else {
            table::add(&mut config.price_feeds, symbol, new_price_data);
        };

        // Emit event
        event::emit_event(&mut events.price_update_events, PriceUpdateEvent {
            symbol,
            old_price,
            new_price: price,
            timestamp: timestamp::now_microseconds(),
            updater: updater_addr,
        });
    }

    /// Get current price
    public fun get_price(symbol: String): (u64, u8, u64, u64) acquires OracleConfig {
        let config = borrow_global<OracleConfig>(@onramp_addr);
        
        assert!(table::contains(&config.price_feeds, symbol), E_INVALID_PRICE);
        let price_data = table::borrow(&config.price_feeds, symbol);
        
        // Check if price is not too old
        let current_time = timestamp::now_microseconds();
        assert!(current_time - price_data.last_updated <= config.max_price_age, E_PRICE_TOO_OLD);
        
        (price_data.price, price_data.decimals, price_data.last_updated, price_data.confidence)
    }

    /// Get price with age check disabled (for admin use)
    public fun get_price_unsafe(symbol: String): (u64, u8, u64, u64) acquires OracleConfig {
        let config = borrow_global<OracleConfig>(@onramp_addr);
        
        assert!(table::contains(&config.price_feeds, symbol), E_INVALID_PRICE);
        let price_data = table::borrow(&config.price_feeds, symbol);
        
        (price_data.price, price_data.decimals, price_data.last_updated, price_data.confidence)
    }

    /// Add authorized updater (admin only)
    public entry fun add_updater(admin: &signer, new_updater: address) acquires OracleConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OracleConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        
        if (table::contains(&config.authorized_updaters, new_updater)) {
            *table::borrow_mut(&mut config.authorized_updaters, new_updater) = true;
        } else {
            table::add(&mut config.authorized_updaters, new_updater, true);
        };
    }

    /// Remove authorized updater (admin only)
    public entry fun remove_updater(admin: &signer, updater: address) acquires OracleConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OracleConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        
        if (table::contains(&config.authorized_updaters, updater)) {
            *table::borrow_mut(&mut config.authorized_updaters, updater) = false;
        };
    }

    /// Update oracle settings (admin only)
    public entry fun update_settings(
        admin: &signer,
        max_price_age: u64,
        min_confidence: u64,
    ) acquires OracleConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OracleConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        
        config.max_price_age = max_price_age;
        config.min_confidence = min_confidence;
    }

    /// Batch update multiple prices
    public entry fun batch_update_prices(
        updater: &signer,
        symbols: vector<String>,
        prices: vector<u64>,
        confidences: vector<u64>,
    ) acquires OracleConfig, OracleEvents {
        let updater_addr = signer::address_of(updater);
        let config = borrow_global_mut<OracleConfig>(@onramp_addr);
        
        // Check authorization
        assert!(
            table::contains(&config.authorized_updaters, updater_addr) &&
            *table::borrow(&config.authorized_updaters, updater_addr),
            E_NOT_AUTHORIZED
        );

        let len = std::vector::length(&symbols);
        assert!(len == std::vector::length(&prices), E_INVALID_PRICE);
        assert!(len == std::vector::length(&confidences), E_INVALID_PRICE);

        let i = 0;
        while (i < len) {
            let symbol = *std::vector::borrow(&symbols, i);
            let price = *std::vector::borrow(&prices, i);
            let confidence = *std::vector::borrow(&confidences, i);
            
            update_price(updater, symbol, price, confidence);
            i = i + 1;
        };
    }
}
