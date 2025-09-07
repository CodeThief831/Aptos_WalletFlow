module onramp_addr::OnRamp {
    use std::signer;
    use std::string::{Self, String};
    use std::timestamp;
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::managed_coin;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::table::{Self, Table};

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;
    const E_INVALID_AMOUNT: u64 = 3;
    const E_CONTRACT_PAUSED: u64 = 4;
    const E_ALREADY_INITIALIZED: u64 = 5;
    const E_NOT_INITIALIZED: u64 = 6;
    const E_INVALID_RATE: u64 = 7;
    const E_WITHDRAWAL_NOT_FOUND: u64 = 8;
    const E_WITHDRAWAL_ALREADY_PROCESSED: u64 = 9;
    const E_INVALID_STATUS: u64 = 10;

    /// Test USDC coin type for demonstration
    struct TestUSDC {}

    /// OnRamp configuration and state
    struct OnRampConfig has key {
        admin: address,
        is_paused: bool,
        total_minted_usdc: u64,
        total_transferred_apt: u64,
        total_apt_to_inr: u64,
        fee_rate: u64, // Fee rate in basis points (e.g., 100 = 1%)
        exchange_rates: Table<String, u64>, // token_type -> rate (in wei/smallest unit)
        treasury_address: address,
        min_withdrawal_amount: u64,
        max_withdrawal_amount: u64,
    }

    /// Withdrawal request structure
    struct WithdrawalRequest has store, drop, copy {
        id: u64,
        user: address,
        amount: u64,
        token_type: String,
        inr_amount: u64,
        status: u8, // 0: pending, 1: processing, 2: completed, 3: failed, 4: cancelled
        created_at: u64,
        processed_at: u64,
        transaction_hash: String,
    }

    /// Withdrawal storage
    struct WithdrawalStorage has key {
        requests: Table<u64, WithdrawalRequest>,
        next_id: u64,
        user_withdrawals: Table<address, vector<u64>>, // user -> withdrawal_ids
    }

    /// Transaction record for events
    struct Transaction has store, drop {
        user: address,
        amount: u64,
        token_type: String,
        timestamp: u64,
        transaction_id: String,
        inr_amount: u64,
        exchange_rate: u64,
    }

    /// OnRamp transaction (buy crypto with INR)
    struct OnRampTransaction has store, drop {
        user: address,
        inr_amount: u64,
        token_amount: u64,
        token_type: String,
        payment_id: String,
        exchange_rate: u64,
        fees: u64,
        timestamp: u64,
    }

    /// OffRamp transaction (sell crypto for INR)
    struct OffRampTransaction has store, drop {
        user: address,
        token_amount: u64,
        inr_amount: u64,
        token_type: String,
        withdrawal_id: u64,
        exchange_rate: u64,
        fees: u64,
        timestamp: u64,
        status: u8,
    }

    /// Events
    struct OnRampEvents has key {
        onramp_events: EventHandle<OnRampTransaction>,
        offramp_events: EventHandle<OffRampTransaction>,
        usdc_mint_events: EventHandle<Transaction>,
        apt_transfer_events: EventHandle<Transaction>,
        usdc_transfer_events: EventHandle<Transaction>,
        withdrawal_created_events: EventHandle<WithdrawalRequest>,
        withdrawal_updated_events: EventHandle<WithdrawalRequest>,
    }

    /// Initialize the OnRamp module
    public entry fun initialize(admin: &signer, treasury: address) {
        let admin_addr = signer::address_of(admin);
        
        // Check if already initialized
        assert!(!exists<OnRampConfig>(admin_addr), E_ALREADY_INITIALIZED);
        
        // Initialize TestUSDC coin
        managed_coin::initialize<TestUSDC>(
            admin,
            b"Test USDC for OnRamp",
            b"TUSDC",
            6, // 6 decimal places like real USDC
            false,
        );

        // Register admin for TestUSDC
        managed_coin::register<TestUSDC>(admin);

        // Create exchange rates table
        let rates = table::new<String, u64>();
        table::add(&mut rates, string::utf8(b"APT"), 1000000000); // 1 APT = 10 INR (in octas)
        table::add(&mut rates, string::utf8(b"USDC"), 8400000); // 1 USDC = 84 INR (in micro-USDC)

        // Create OnRamp configuration
        move_to(admin, OnRampConfig {
            admin: admin_addr,
            is_paused: false,
            total_minted_usdc: 0,
            total_transferred_apt: 0,
            total_apt_to_inr: 0,
            fee_rate: 50, // 0.5% default fee
            exchange_rates: rates,
            treasury_address: treasury,
            min_withdrawal_amount: 1000000, // 0.01 APT in octas
            max_withdrawal_amount: 1000000000000, // 10,000 APT in octas
        });

        // Initialize withdrawal storage
        move_to(admin, WithdrawalStorage {
            requests: table::new<u64, WithdrawalRequest>(),
            next_id: 1,
            user_withdrawals: table::new<address, vector<u64>>(),
        });

        // Initialize events
        move_to(admin, OnRampEvents {
            onramp_events: account::new_event_handle<OnRampTransaction>(admin),
            offramp_events: account::new_event_handle<OffRampTransaction>(admin),
            usdc_mint_events: account::new_event_handle<Transaction>(admin),
            apt_transfer_events: account::new_event_handle<Transaction>(admin),
            usdc_transfer_events: account::new_event_handle<Transaction>(admin),
            withdrawal_created_events: account::new_event_handle<WithdrawalRequest>(admin),
            withdrawal_updated_events: account::new_event_handle<WithdrawalRequest>(admin),
        });
    }

    /// Process OnRamp transaction (mint tokens after INR payment)
    public entry fun process_onramp(
        admin: &signer,
        recipient: address,
        inr_amount: u64,
        token_type: String,
        payment_id: String,
    ) acquires OnRampConfig, OnRampEvents {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OnRampConfig>(admin_addr);
        let events = borrow_global_mut<OnRampEvents>(admin_addr);
        
        // Authorization and validation checks
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(!config.is_paused, E_CONTRACT_PAUSED);
        assert!(inr_amount > 0, E_INVALID_AMOUNT);

        // Get exchange rate
        let rate = *table::borrow(&config.exchange_rates, token_type);
        assert!(rate > 0, E_INVALID_RATE);

        // Calculate token amount (considering decimals)
        let token_amount = if (token_type == string::utf8(b"APT")) {
            (inr_amount * 100000000) / rate // APT has 8 decimals (octas)
        } else {
            (inr_amount * 1000000) / rate // USDC has 6 decimals
        };

        // Calculate fees
        let fees = (token_amount * config.fee_rate) / 10000;
        let final_amount = token_amount - fees;

        // Process token transfer
        if (token_type == string::utf8(b"APT")) {
            // Transfer APT from treasury to user
            coin::transfer<AptosCoin>(admin, recipient, final_amount);
            config.total_transferred_apt = config.total_transferred_apt + final_amount;
        } else if (token_type == string::utf8(b"USDC")) {
            // Mint USDC to user
            if (!coin::is_account_registered<TestUSDC>(recipient)) {
                managed_coin::register<TestUSDC>(admin);
            };
            managed_coin::mint<TestUSDC>(admin, recipient, final_amount);
            config.total_minted_usdc = config.total_minted_usdc + final_amount;
        };

        // Emit OnRamp event
        event::emit_event(&mut events.onramp_events, OnRampTransaction {
            user: recipient,
            inr_amount,
            token_amount: final_amount,
            token_type,
            payment_id,
            exchange_rate: rate,
            fees,
            timestamp: timestamp::now_microseconds(),
        });
    }

    /// Create withdrawal request (OffRamp)
    public entry fun create_withdrawal_request(
        user: &signer,
        amount: u64,
        token_type: String,
    ) acquires OnRampConfig, WithdrawalStorage, OnRampEvents {
        let user_addr = signer::address_of(user);
        let config = borrow_global<OnRampConfig>(@onramp_addr);
        let storage = borrow_global_mut<WithdrawalStorage>(@onramp_addr);
        let events = borrow_global_mut<OnRampEvents>(@onramp_addr);
        
        assert!(!config.is_paused, E_CONTRACT_PAUSED);
        assert!(amount >= config.min_withdrawal_amount, E_INVALID_AMOUNT);
        assert!(amount <= config.max_withdrawal_amount, E_INVALID_AMOUNT);

        // Check user balance
        if (token_type == string::utf8(b"APT")) {
            let balance = coin::balance<AptosCoin>(user_addr);
            assert!(balance >= amount, E_INSUFFICIENT_BALANCE);
        } else if (token_type == string::utf8(b"USDC")) {
            let balance = coin::balance<TestUSDC>(user_addr);
            assert!(balance >= amount, E_INSUFFICIENT_BALANCE);
        };

        // Get exchange rate and calculate INR amount
        let rate = *table::borrow(&config.exchange_rates, token_type);
        let inr_amount = if (token_type == string::utf8(b"APT")) {
            (amount * rate) / 100000000 // Convert from octas
        } else {
            (amount * rate) / 1000000 // Convert from micro-USDC
        };

        // Create withdrawal request
        let withdrawal_id = storage.next_id;
        let request = WithdrawalRequest {
            id: withdrawal_id,
            user: user_addr,
            amount,
            token_type,
            inr_amount,
            status: 0, // pending
            created_at: timestamp::now_microseconds(),
            processed_at: 0,
            transaction_hash: string::utf8(b""),
        };

        table::add(&mut storage.requests, withdrawal_id, request);
        storage.next_id = storage.next_id + 1;

        // Add to user's withdrawal list
        if (table::contains(&storage.user_withdrawals, user_addr)) {
            let user_list = table::borrow_mut(&mut storage.user_withdrawals, user_addr);
            vector::push_back(user_list, withdrawal_id);
        } else {
            let new_list = vector::empty<u64>();
            vector::push_back(&mut new_list, withdrawal_id);
            table::add(&mut storage.user_withdrawals, user_addr, new_list);
        };

        // Emit event
        event::emit_event(&mut events.withdrawal_created_events, request);

        // Emit OffRamp event
        event::emit_event(&mut events.offramp_events, OffRampTransaction {
            user: user_addr,
            token_amount: amount,
            inr_amount,
            token_type,
            withdrawal_id,
            exchange_rate: rate,
            fees: 0, // Fees handled separately
            timestamp: timestamp::now_microseconds(),
            status: 0,
        });
    }

    /// Process withdrawal (admin confirms token transfer)
    public entry fun process_withdrawal(
        admin: &signer,
        withdrawal_id: u64,
        transaction_hash: String,
        status: u8, // 1: processing, 2: completed, 3: failed
    ) acquires OnRampConfig, WithdrawalStorage, OnRampEvents {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OnRampConfig>(admin_addr);
        let storage = borrow_global_mut<WithdrawalStorage>(admin_addr);
        let events = borrow_global_mut<OnRampEvents>(admin_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(table::contains(&storage.requests, withdrawal_id), E_WITHDRAWAL_NOT_FOUND);
        assert!(status >= 1 && status <= 3, E_INVALID_STATUS);

        let request = table::borrow_mut(&mut storage.requests, withdrawal_id);
        assert!(request.status == 0 || request.status == 1, E_WITHDRAWAL_ALREADY_PROCESSED);

        // Update request
        request.status = status;
        request.processed_at = timestamp::now_microseconds();
        request.transaction_hash = transaction_hash;

        // If completed, transfer tokens to treasury
        if (status == 2) {
            if (request.token_type == string::utf8(b"APT")) {
                config.total_apt_to_inr = config.total_apt_to_inr + request.amount;
            };
        };

        // Emit event
        event::emit_event(&mut events.withdrawal_updated_events, *request);
    }

    /// Update exchange rates (admin only)
    public entry fun update_exchange_rate(
        admin: &signer,
        token_type: String,
        new_rate: u64,
    ) acquires OnRampConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OnRampConfig>(admin_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(new_rate > 0, E_INVALID_RATE);

        if (table::contains(&config.exchange_rates, token_type)) {
            *table::borrow_mut(&mut config.exchange_rates, token_type) = new_rate;
        } else {
            table::add(&mut config.exchange_rates, token_type, new_rate);
        };
    }

    /// Set withdrawal limits (admin only)
    public entry fun set_withdrawal_limits(
        admin: &signer,
        min_amount: u64,
        max_amount: u64,
    ) acquires OnRampConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OnRampConfig>(admin_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(min_amount > 0 && max_amount > min_amount, E_INVALID_AMOUNT);

        config.min_withdrawal_amount = min_amount;
        config.max_withdrawal_amount = max_amount;
    }

    /// Transfer tokens from user to treasury for withdrawal
    public entry fun transfer_for_withdrawal(
        user: &signer,
        withdrawal_id: u64,
    ) acquires OnRampConfig, WithdrawalStorage {
        let user_addr = signer::address_of(user);
        let config = borrow_global<OnRampConfig>(@onramp_addr);
        let storage = borrow_global<WithdrawalStorage>(@onramp_addr);
        
        assert!(table::contains(&storage.requests, withdrawal_id), E_WITHDRAWAL_NOT_FOUND);
        let request = table::borrow(&storage.requests, withdrawal_id);
        assert!(request.user == user_addr, E_NOT_AUTHORIZED);
        assert!(request.status == 0, E_WITHDRAWAL_ALREADY_PROCESSED);

        // Transfer tokens to treasury
        if (request.token_type == string::utf8(b"APT")) {
            coin::transfer<AptosCoin>(user, config.treasury_address, request.amount);
        } else if (request.token_type == string::utf8(b"USDC")) {
            coin::transfer<TestUSDC>(user, config.treasury_address, request.amount);
        };
    }

    /// Get withdrawal request details
    public fun get_withdrawal_request(withdrawal_id: u64): WithdrawalRequest acquires WithdrawalStorage {
        let storage = borrow_global<WithdrawalStorage>(@onramp_addr);
        assert!(table::contains(&storage.requests, withdrawal_id), E_WITHDRAWAL_NOT_FOUND);
        *table::borrow(&storage.requests, withdrawal_id)
    }

    /// Get user's withdrawal history
    public fun get_user_withdrawals(user: address): vector<u64> acquires WithdrawalStorage {
        let storage = borrow_global<WithdrawalStorage>(@onramp_addr);
        if (table::contains(&storage.user_withdrawals, user)) {
            *table::borrow(&storage.user_withdrawals, user)
        } else {
            vector::empty<u64>()
        }
    }

    /// Get exchange rate for a token
    public fun get_exchange_rate(token_type: String): u64 acquires OnRampConfig {
        let config = borrow_global<OnRampConfig>(@onramp_addr);
        if (table::contains(&config.exchange_rates, token_type)) {
            *table::borrow(&config.exchange_rates, token_type)
        } else {
            0
        }
    }

    /// Get TestUSDC balance of an account
    public fun get_usdc_balance(account: address): u64 {
        if (coin::is_account_registered<TestUSDC>(account)) {
            coin::balance<TestUSDC>(account)
        } else {
            0
        }
    }

    /// Get APT balance of an account
    public fun get_apt_balance(account: address): u64 {
        coin::balance<AptosCoin>(account)
    }

    /// Check if account is registered for TestUSDC
    public fun is_usdc_registered(account: address): bool {
        coin::is_account_registered<TestUSDC>(account)
    }

    /// Pause/unpause the OnRamp (admin only)
    public entry fun set_pause_status(admin: &signer, paused: bool) acquires OnRampConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OnRampConfig>(admin_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        config.is_paused = paused;
    }

    /// Set fee rate (admin only)
    public entry fun set_fee_rate(admin: &signer, new_fee_rate: u64) acquires OnRampConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<OnRampConfig>(admin_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(new_fee_rate <= 1000, E_INVALID_AMOUNT); // Max 10% fee
        config.fee_rate = new_fee_rate;
    }

    /// Get contract statistics
    public fun get_stats(): (u64, u64, u64, u64, bool) acquires OnRampConfig {
        let config = borrow_global<OnRampConfig>(@onramp_addr);
        (
            config.total_minted_usdc,
            config.total_transferred_apt,
            config.total_apt_to_inr,
            config.fee_rate,
            config.is_paused
        )
    }

    /// Get withdrawal limits
    public fun get_withdrawal_limits(): (u64, u64) acquires OnRampConfig {
        let config = borrow_global<OnRampConfig>(@onramp_addr);
        (config.min_withdrawal_amount, config.max_withdrawal_amount)
    }

    /// Emergency withdraw function (admin only)
    public entry fun emergency_withdraw_apt(
        admin: &signer,
        amount: u64,
    ) acquires OnRampConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<OnRampConfig>(admin_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);
        
        let balance = coin::balance<AptosCoin>(admin_addr);
        assert!(balance >= amount, E_INSUFFICIENT_BALANCE);
        
        coin::transfer<AptosCoin>(admin, config.treasury_address, amount);
    }

    /// Register user for TestUSDC (public utility function)
    public entry fun register_usdc(user: &signer) {
        managed_coin::register<TestUSDC>(user);
    }

    /// Register user for APT (utility function)
    public entry fun register_apt(user: &signer) {
        coin::register<AptosCoin>(user);
    }
}
